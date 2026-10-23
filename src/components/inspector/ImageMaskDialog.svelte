<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { assetUrl } from '../../lib/state/asset-urls.svelte.js';
  import { updateElement, session } from '../../lib/state/project.svelte.js';
  import { normaliseMask } from '../../lib/domain/mask.js';

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
  const polygon = $derived(points.map((point) => `${point.x},${point.y}`).join(' '));

  // Points are stored in frame percentages. The dialog works in the image
  // content box (the area inside the letterboxed frame), so the mask always
  // matches the visible image.
  function contentBox() {
    const fw = element?.frame.w ?? 1;
    const fh = element?.frame.h ?? 1;
    if (imageAspect >= frameAspect) {
      const cw = fw;
      const ch = fw / imageAspect;
      return { x: 0, y: (fh - ch) / 2, w: cw, h: ch };
    }
    const ch = fh;
    const cw = fh * imageAspect;
    return { x: (fw - cw) / 2, y: 0, w: cw, h: ch };
  }

  function frameToContent(point) {
    const box = contentBox();
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
    framePoints = normaliseMask(element.mask);
    points = [];
    naturalAspect = null;
    history = [];
    future = [];
    drag = null;
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
    return points.map((point) => ({ ...point }));
  }

  function commit(next) {
    history = [...history, snapshot()];
    future = [];
    points = next;
  }

  function undo() {
    if (!history.length) return;
    future = [snapshot(), ...future];
    points = history[history.length - 1];
    history = history.slice(0, -1);
  }

  function redo() {
    if (!future.length) return;
    history = [...history, snapshot()];
    points = future[0];
    future = future.slice(1);
  }

  function nearIndex(point, exclude = -1) {
    return points.findIndex(
      (item, index) =>
        index !== exclude &&
        Math.hypot(item.x - point.x, item.y - point.y) < MERGE
    );
  }

  function pointFromEvent(event) {
    const rect = event.currentTarget.closest('.mask-canvas').getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
    };
  }

  function startCanvas(event) {
    if (!url || drag) return;
    const point = pointFromEvent(event);
    const index = nearIndex(point);
    if (index !== -1) {
      event.preventDefault();
      drag = { index, before: snapshot() };
      return;
    }
    commit([...points, point]);
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
    if (other !== -1) next = points.filter((_, pointIndex) => pointIndex !== index);
    if (JSON.stringify(before) !== JSON.stringify(next)) {
      history = [...history, before];
      future = [];
      points = next;
    }
  }

  function save() {
    if (!element) return;
    updateElement(element.id, {
      mask: points.length >= 3 ? points.map(contentToFrame) : []
    });
    open = false;
  }

  function clearMask() {
    commit([]);
  }
</script>

<svelte:window onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag} />

<Dialog bind:open title={t('mask.title')} wide>
  <div class="mask-dialog">
    <p class="hint">{t('mask.hint')}</p>
    <button
      type="button"
      class="mask-canvas"
      style:aspect-ratio={aspect}
      style:width={`min(100%, calc(58vh * ${imageAspect}))`}
      onpointerdown={startCanvas}
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
              points = framePoints.map(frameToContent);
            }
          }}
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {#if points.length > 1}
            <polygon
              points={polygon}
              fill="rgba(155,199,245,.18)"
              stroke="var(--selection)"
              stroke-width="1"
              vector-effect="non-scaling-stroke"
            />
          {/if}
          {#each points as point, index (index)}
            <circle
              cx={point.x}
              cy={point.y}
              r="1.2"
              fill="var(--selection)"
              vector-effect="non-scaling-stroke"
              class="node"
            />
          {/each}
        </svg>
      {:else if loadError}
        <p class="missing">{t('mask.missing')}</p>
      {:else}
        <p class="missing">{t('mask.loading')}</p>
      {/if}
    </button>
    <div class="mask-footer">
      <span class="hint">{t('mask.points', { count: points.length })}</span>
      <span class="actions">
        <Button size="sm" variant="ghost" onclick={undo} disabled={!history.length}>
          {t('mask.undo')}
        </Button>
        <Button size="sm" variant="ghost" onclick={redo} disabled={!future.length}>
          {t('mask.redo')}
        </Button>
        <Button size="sm" variant="ghost" onclick={clearMask} disabled={!points.length}>
          <Icon name="trash" size={12} />{t('mask.clear')}
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
  .mask-canvas :global(.node) {
    pointer-events: all;
    cursor: grab;
  }
  .mask-canvas :global(.node):active {
    cursor: grabbing;
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
