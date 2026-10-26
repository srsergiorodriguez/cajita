<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { assetUrl } from '../../lib/state/asset-urls.svelte.js';
  import { updateElement, session } from '../../lib/state/project.svelte.js';
  import {
    closestMaskOutline,
    normaliseMask,
    sampleMask
  } from '../../lib/domain/mask.js';

  let { open = $bindable(false), element } = $props();
  let points = $state([]);
  let history = $state([]);
  let future = $state([]);
  let drag = $state(null);
  let canvasEl = $state(null);
  let url = $state(null);
  let loadedKey = $state('');
  let loadError = $state(false);
  let naturalAspect = $state(null);
  let framePoints = $state([]);
  let curve = $state(false);
  let selectedIndex = $state(null);
  const MERGE = 2.5;

  const asset = $derived(
    element?.assetId ? session.project?.assets?.[element.assetId] : null
  );
  const frameAspect = $derived(element ? element.frame.w / element.frame.h : 1.5);
  const imageAspect = $derived(
    naturalAspect ??
      (asset?.width && asset?.height ? asset.width / asset.height : frameAspect)
  );
  const aspect = $derived(imageAspect);
  const outline = $derived(sampleMask(points, { curve }));
  const polygon = $derived(outline.map((point) => `${point.x},${point.y}`).join(' '));

  // Points are stored in frame percentages. The dialog works in the image
  // content box (the area inside the letterboxed frame), so the mask always
  // matches the visible image.
  function contentBox(aspectValue = imageAspect) {
    const fw = element?.frame.w ?? 1;
    const fh = element?.frame.h ?? 1;
    if (aspectValue >= frameAspect) {
      const cw = fw;
      const ch = fw / aspectValue;
      return { x: 0, y: (fh - ch) / 2, w: cw, h: ch };
    }
    const ch = fh;
    const cw = fh * aspectValue;
    return { x: (fw - cw) / 2, y: 0, w: cw, h: ch };
  }

  function frameToContent(point, aspectValue = imageAspect) {
    const box = contentBox(aspectValue);
    return {
      x: Math.max(0, Math.min(100, ((point.x / 100) * element.frame.w - box.x) / box.w * 100)),
      y: Math.max(0, Math.min(100, ((point.y / 100) * element.frame.h - box.y) / box.h * 100))
    };
  }

  function contentToFrame(point) {
    const box = contentBox();
    return {
      x: ((box.x + (point.x / 100) * box.w) / element.frame.w) * 100,
      y: ((box.y + (point.y / 100) * box.h) / element.frame.h) * 100
    };
  }

  $effect(() => {
    if (!open || !element) return;
    const nextFramePoints = normaliseMask(element.mask);
    framePoints = nextFramePoints;
    curve = element.maskCurve === true;
    naturalAspect = null;
    const initialAspect =
      asset?.width && asset?.height ? asset.width / asset.height : frameAspect;
    points = nextFramePoints.map((point) => frameToContent(point, initialAspect));
    history = [];
    future = [];
    drag = null;
    selectedIndex = null;
    const key = `${session.project.id}:${element.assetId}`;
    if (loadedKey !== key) {
      loadedKey = key;
      url = null;
      loadError = false;
      assetUrl(session.project.id, element.assetId)
        .then((next) => {
          if (next) url = next;
          else loadError = true;
        })
        .catch(() => (loadError = true));
    }
  });

  function snapshot() {
    return { points: points.map((point) => ({ ...point })), curve };
  }

  function restore(snapshotValue) {
    points = snapshotValue.points.map((point) => ({ ...point }));
    curve = snapshotValue.curve;
  }

  function commit(nextPoints, nextCurve = curve) {
    history = [...history, snapshot()];
    future = [];
    points = nextPoints;
    curve = nextCurve;
  }

  function undo() {
    if (!history.length) return;
    future = [snapshot(), ...future];
    restore(history[history.length - 1]);
    history = history.slice(0, -1);
    selectedIndex = null;
  }

  function redo() {
    if (!future.length) return;
    history = [...history, snapshot()];
    restore(future[0]);
    future = future.slice(1);
    selectedIndex = null;
  }

  function nearIndex(point, exclude = -1) {
    return points.findIndex(
      (item, index) =>
        index !== exclude &&
        Math.hypot(item.x - point.x, item.y - point.y) < MERGE
    );
  }

  function pointFromEvent(event) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
    };
  }

  function segmentThreshold() {
    if (!canvasEl) return 2;
    const rect = canvasEl.getBoundingClientRect();
    return Math.max(1, (8 / Math.max(1, Math.min(rect.width, rect.height))) * 100);
  }

  function startCanvas(event) {
    if (!url || drag) return;
    const point = pointFromEvent(event);
    const nodeIndex = nearIndex(point);
    if (nodeIndex !== -1) {
      selectedIndex = nodeIndex;
      drag = { index: nodeIndex, before: snapshot() };
      return;
    }
    if (points.length < 3) {
      commit([...points, point]);
      selectedIndex = points.length - 1;
      return;
    }
    const segment = closestMaskOutline(
      points,
      point,
      segmentThreshold(),
      curve
    );
    if (segment) {
      const next = [
        ...points.slice(0, segment.index + 1),
        { x: segment.x, y: segment.y },
        ...points.slice(segment.index + 1)
      ];
      commit(next);
      selectedIndex = segment.index + 1;
      return;
    }
    commit([...points, point]);
    selectedIndex = points.length - 1;
  }

  function startNode(event, index) {
    event.preventDefault();
    event.stopPropagation();
    selectedIndex = index;
    drag = { index, before: snapshot() };
  }

  function moveDrag(event) {
    if (!drag || !canvasEl) return;
    event.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    points = points.map((point, index) =>
      index === drag.index ? { x, y } : point
    );
  }

  function endDrag() {
    if (!drag) return;
    const { index, before } = drag;
    drag = null;
    const moved = points[index];
    const other = moved ? nearIndex(moved, index) : -1;
    let next = points;
    if (other !== -1) {
      next = points.filter((_, pointIndex) => pointIndex !== index);
    }
    if (JSON.stringify(before.points) !== JSON.stringify(next) || before.curve !== curve) {
      history = [...history, before];
      future = [];
      points = next;
      selectedIndex = other === -1 ? index : Math.min(other, next.length - 1);
    }
  }

  function deleteSelected() {
    if (selectedIndex === null || selectedIndex < 0) return;
    const next = points.filter((_, index) => index !== selectedIndex);
    commit(next);
    selectedIndex = null;
  }

  function toggleCurve(event) {
    commit(points, event.currentTarget.checked);
  }

  function handleKeydown(event) {
    if (!open) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIndex !== null) {
      event.preventDefault();
      deleteSelected();
    }
  }

  function save() {
    if (!element) return;
    updateElement(element.id, {
      mask: points.length >= 3 ? points.map(contentToFrame) : [],
      maskCurve: points.length >= 3 ? curve : false
    });
    open = false;
  }

  function clearMask() {
    commit([]);
    selectedIndex = null;
  }
</script>

<svelte:window
  onpointermove={moveDrag}
  onpointerup={endDrag}
  onpointercancel={endDrag}
  onkeydown={handleKeydown}
/>

<Dialog bind:open title={t('mask.title')} wide>
  <div class="mask-dialog">
    <p class="hint">{t('mask.hint')}</p>
    <div
      class="mask-canvas"
      style:aspect-ratio={aspect}
      style:width={`min(100%, calc(58vh * ${imageAspect}))`}
      onpointerdown={startCanvas}
      role="application"
      aria-label={t('mask.canvas')}
      bind:this={canvasEl}
    >
      {#if url}
        <img
          src={url}
          alt=""
          draggable="false"
          onload={(event) => {
            const image = event.currentTarget;
            if (!naturalAspect && image.naturalWidth && image.naturalHeight) {
              naturalAspect = image.naturalWidth / image.naturalHeight;
              points = framePoints.map((point) =>
                frameToContent(point, image.naturalWidth / image.naturalHeight)
              );
            }
          }}
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {#if outline.length > 1}
            <polygon
              points={polygon}
              fill="rgba(155,199,245,.18)"
              stroke="var(--selection)"
              stroke-width="1"
              vector-effect="non-scaling-stroke"
            />
          {/if}
        </svg>
        <div class="mask-nodes">
          {#each points as point, index (index)}
            <button
              type="button"
              class="node"
              class:selected={selectedIndex === index}
              style:left={`${point.x}%`}
              style:top={`${point.y}%`}
              aria-label={t('mask.node', { number: index + 1 })}
              title={t('mask.node', { number: index + 1 })}
              onpointerdown={(event) => startNode(event, index)}
            ></button>
          {/each}
        </div>
      {:else if loadError}
        <p class="missing">{t('mask.missing')}</p>
      {:else}
        <p class="missing">{t('mask.loading')}</p>
      {/if}
    </div>
    <div class="mask-footer">
      <span class="hint">{t('mask.points', { count: points.length })}</span>
      <span class="curve-toggle">
        <label>
          <input type="checkbox" checked={curve} onchange={toggleCurve} />
          <span>{t('mask.curves')}</span>
        </label>
      </span>
      <span class="actions">
        <Button size="sm" variant="ghost" onclick={undo} disabled={!history.length}>
          {t('mask.undo')}
        </Button>
        <Button size="sm" variant="ghost" onclick={redo} disabled={!future.length}>
          {t('mask.redo')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onclick={deleteSelected}
          disabled={selectedIndex === null}
        >
          <Icon name="trash" size={12} />{t('mask.deleteNode')}
        </Button>
        <Button size="sm" variant="ghost" onclick={clearMask} disabled={!points.length}>
          {t('mask.clear')}
        </Button>
        <Button size="sm" variant="ghost" onclick={() => (open = false)}>{t('common.cancel')}</Button>
        <Button size="sm" variant="accent" onclick={save} disabled={points.length < 3}>
          {t('mask.save')}
        </Button>
      </span>
    </div>
  </div>
</Dialog>

<style>
  .mask-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
  .mask-canvas {
    position: relative;
    margin: 0 auto;
    max-height: 58vh;
    overflow: hidden;
    border: 1px solid var(--line);
    background: var(--stage);
    cursor: crosshair;
    touch-action: none;
  }
  .mask-canvas img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    pointer-events: none;
  }
  .mask-canvas svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .mask-nodes {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .node {
    position: absolute;
    z-index: 2;
    width: 14px;
    height: 14px;
    padding: 0;
    border: 2px solid var(--panel);
    border-radius: 50%;
    background: var(--selection);
    box-shadow: 0 0 0 1px var(--selection);
    transform: translate(-50%, -50%);
    cursor: grab;
    pointer-events: all;
  }
  .node:active {
    cursor: grabbing;
  }
  .node.selected {
    background: var(--panel);
    box-shadow: 0 0 0 3px var(--selection);
  }
  .curve-toggle {
    display: flex;
    align-items: center;
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
  }
  .curve-toggle label {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .curve-toggle input {
    accent-color: var(--selection);
  }
  .missing {
    display: grid;
    place-items: center;
    height: 100%;
    margin: 0;
    color: var(--muted);
    font-size: var(--text-xs);
  }
  .mask-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line-soft);
    flex-wrap: wrap;
  }
  .actions {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }
</style>
