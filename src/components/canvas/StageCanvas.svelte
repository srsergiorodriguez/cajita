<script>
  import CanvasAsset from './CanvasAsset.svelte';
  import CanvasVideo from './CanvasVideo.svelte';
  import CanvasAudio from './CanvasAudio.svelte';
  import CanvasEmbed from './CanvasEmbed.svelte';
  import ShapeArt from './ShapeArt.svelte';
  import CanvasFicha from './CanvasFicha.svelte';
  import Icon from '../ui/Icon.svelte';
  import IconButton from '../ui/IconButton.svelte';
  import { t, plural } from '../../lib/i18n/index.svelte.js';
  import {
    activePage,
    addElement,
    fitTextHeight,
    selectedElements,
    session,
    selectElement,
    updateElement,
    moveElements
  } from '../../lib/state/project.svelte.js';
  import {
    editor,
    setGuides,
    clearGuides,
    beginTextEdit,
    endTextEdit
  } from '../../lib/state/editor.svelte.js';
  import { ensureProjectFonts, fontState } from '../../lib/state/fonts.svelte.js';
  import {
    elementToCss,
    pxToCqw,
    pointToLocal,
    rotateFrame,
    resizeRotatedFrame,
    snapMove
  } from '../../lib/domain/geometry.js';
  import { elementName, fontStack, mediaFrame } from '../../lib/domain/elements.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let stageEl = $state(null);
  let wrapEl = $state(null);
  let wrapW = $state(0);
  let wrapH = $state(0);
  let zoom = $state(1);
  let textarea = $state(null);
  let pointerState = null;

  const page = $derived(activePage());
  const stage = $derived(session.project?.stage ?? { width: 1200, height: 800 });
  const pageBackground = $derived(
    page?.background?.color ?? stage.background?.color ?? '#fffdf7'
  );
  const elements = $derived(
    [...(page?.elements ?? [])].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
  );
  const selected = $derived(selectedElements());
  const primary = $derived(selected[0] ?? null);
  const editing = $derived(
    page?.elements.find((element) => element.id === editor.editingElementId) ?? null
  );
  const placementAsset = $derived(
    session.selectedAssetId ? session.project?.assets?.[session.selectedAssetId] : null
  );
  const placing = $derived(['image', 'video', 'audio'].includes(placementAsset?.kind));
  const aspect = $derived(stage.width / stage.height);
  const textMeasureKey = $derived(
    elements
      .filter((element) => element.type === 'text' && !element.hidden)
      .map(
        (element) =>
          `${element.id}:${element.text}:${element.font}:${element.fontSize}:${element.lineHeight}:${element.letterSpacing}:${element.frame.w}:${element.padding}:${element.hidden}`
      )
      .join('|')
  );
  const stageWidth = $derived(Math.max(120, Math.max(0, wrapW - 48) * zoom));
  const stageHeight = $derived(stageWidth / aspect);
  const padWidth = $derived(Math.max(wrapW, stageWidth + 48));
  const padHeight = $derived(Math.max(wrapH, stageHeight + 48));

  $effect(() => {
    fontState.version;
    if (session.project) void ensureProjectFonts(session.project);
  });

  $effect(() => {
    if (!wrapEl) return;
    const observer = new ResizeObserver(([entry]) => {
      wrapW = entry.contentRect.width;
      wrapH = entry.contentRect.height;
    });
    observer.observe(wrapEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    textMeasureKey;
    fontState.version;
    if (!stageEl || !session.project) return;
    queueMicrotask(() => {
      if (!stageEl) return;
      const stageRect = stageEl.getBoundingClientRect();
      if (!stageRect.height) return;
      const scale = stage.height / stageRect.height;
      for (const element of elements) {
        if (element.type !== 'text' || element.hidden) continue;
        const node = stageEl.querySelector(
          `[data-element-id="${CSS.escape(element.id)}"] .text-content`
        );
        if (!node) continue;
        const contentHeight = node.offsetHeight * scale;
        const padding = (element.padding || 0) * 2;
        const oneLine = element.fontSize * element.lineHeight;
        fitTextHeight(element.id, Math.max(oneLine, contentHeight) + padding);
      }
    });
  });

  function setZoom(next) {
    zoom = Math.min(4, Math.max(0.25, Math.round(next * 100) / 100));
  }

  function fitWidth() {
    zoom = 1;
  }

  $effect(() => {
    if (editing && textarea) {
      queueMicrotask(() => textarea?.focus());
    }
  });

  function cssVars(element) {
    const vars = elementToCss(element, stage);
    return Object.entries(vars)
      .map(([key, value]) => `${key}:${value}`)
      .join(';');
  }

  function textStyle(element) {
    const font = fontStack(session.project, element.font);
    return [
      cssVars(element),
      `font-family:${font}`,
      `font-size:${pxToCqw(element.fontSize, stage.width)}`,
      `line-height:${element.lineHeight}`,
      `letter-spacing:${pxToCqw(element.letterSpacing, stage.width)}`,
      `color:${element.color}`,
      `text-align:${element.align}`,
      `background:${element.background || 'transparent'}`,
      `padding:${pxToCqw(element.padding || 0, stage.width)}`,
      `font-weight:${element.heading ? 700 : 400}`
    ].join(';');
  }

  function textEditorBackground(color) {
    const raw = String(color ?? '').replace('#', '');
    const hex =
      raw.length === 3
        ? raw
            .split('')
            .map((part) => part + part)
            .join('')
        : raw;
    if (!/^[0-9a-f]{6}$/i.test(hex)) return 'var(--stage)';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#171b21' : '#fffdf7';
  }

  function stagePoint(event) {
    if (!stageEl) return { x: 0, y: 0 };
    const rect = stageEl.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * stage.width,
      y: ((event.clientY - rect.top) / rect.height) * stage.height
    };
  }

  function clearPointer() {
    pointerState = null;
    clearGuides();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', clearPointer);
  }

  function onPointerMove(event) {
    try {
      handlePointerMove(event);
    } catch (error) {
      clearPointer();
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function handlePointerMove(event) {
    if (!pointerState) return;
    const point = stagePoint(event);

    if (pointerState.mode === 'move') {
      const primaryStart = pointerState.frames.get(pointerState.primaryId);
      if (!primaryStart) return;
      const raw = {
        ...primaryStart,
        x: primaryStart.x + (point.x - pointerState.start.x),
        y: primaryStart.y + (point.y - pointerState.start.y)
      };
      const result = snapMove(raw, stage, pointerState.others, {
        enabled: editor.snap && !event.altKey,
        threshold: 6
      });
      setGuides(result.guides.x, result.guides.y);
      const dx = result.frame.x - primaryStart.x;
      const dy = result.frame.y - primaryStart.y;
      if (dx !== pointerState.lastDx || dy !== pointerState.lastDy) {
        moveElements(
          pointerState.ids,
          dx - pointerState.lastDx,
          dy - pointerState.lastDy,
          {
            coalesceKey: `move:${pointerState.ids.join(',')}`
          }
        );
        pointerState.lastDx = dx;
        pointerState.lastDy = dy;
      }
      return;
    }

    if (pointerState.mode === 'resize') {
      const local = pointToLocal(point, pointerState.frame);
      const frame = resizeRotatedFrame(pointerState.frame, pointerState.handle, local, {
        keepAspect: event.shiftKey,
        minSize: 24
      });
      updateElement(
        pointerState.id,
        { frame },
        {
          coalesceKey: `resize:${pointerState.id}`
        }
      );
      return;
    }

    if (pointerState.mode === 'rotate') {
      const frame = rotateFrame(pointerState.frame, point, event.shiftKey ? 0 : 15);
      updateElement(
        pointerState.id,
        { frame: { rotation: frame.rotation } },
        {
          coalesceKey: `rotate:${pointerState.id}`
        }
      );
    }
  }

  function beginPointer(next) {
    pointerState = next;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', clearPointer, { once: true });
  }

  function startDrag(event, element) {
    if (event.button !== 0 || element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(element.id, { additive: event.shiftKey });
    if (!session.selectedElementIds.includes(element.id)) return;
    const chosen = selectedElements();
    beginPointer({
      mode: 'move',
      start: stagePoint(event),
      primaryId: element.id,
      ids: chosen.map((item) => item.id),
      frames: new Map(chosen.map((item) => [item.id, { ...item.frame }])),
      others: elements
        .filter((item) => !chosen.some((picked) => picked.id === item.id))
        .map((item) => item.frame),
      lastDx: 0,
      lastDy: 0
    });
  }

  function startResize(event, handle) {
    if (!primary || primary.locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    beginPointer({
      mode: 'resize',
      id: primary.id,
      handle,
      frame: { ...primary.frame }
    });
  }

  function startRotate(event) {
    if (!primary || primary.locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    beginPointer({ mode: 'rotate', id: primary.id, frame: { ...primary.frame } });
  }

  function onStagePointerDown(event) {
    if (event.target !== event.currentTarget) return;
    const target = event.target;
    if (target.classList.contains('element')) return;
    if (editor.editingElementId) commitText();

    if (placing && placementAsset) {
      const point = stagePoint(event);
      const frame = mediaFrame(placementAsset, stage, page?.elements.length ?? 0);
      frame.x = Math.min(Math.max(0, point.x - frame.w / 2), stage.width - frame.w);
      frame.y = Math.min(Math.max(0, point.y - frame.h / 2), stage.height - frame.h);
      try {
        addElement(placementAsset.kind, { assetId: placementAsset.id, frame });
      } catch (error) {
        toast(error instanceof Error ? error.message : String(error), 'error');
      }
      return;
    }

    selectElement(null);
  }

  function startTextEdit(event, element) {
    if (element.type !== 'text' || element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(element.id);
    beginTextEdit(element);
  }

  function commitText() {
    const element = editing;
    if (element) {
      const text = editor.textDraft;
      if (text !== element.text) {
        updateElement(element.id, { text }, { coalesceKey: `text:${element.id}` });
      }
    }
    endTextEdit();
  }

  function handleTextKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      commitText();
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      commitText();
    }
  }
</script>

<section class="desk" aria-label={t('canvas.title')}>
  <div class="stage-wrap" bind:this={wrapEl}>
    <div class="stage-pad" style:width={`${padWidth}px`} style:height={`${padHeight}px`}>
      <div
        class="stage"
        bind:this={stageEl}
        style:aspect-ratio={`${stage.width} / ${stage.height}`}
        style:width={`${stageWidth}px`}
        style:--stage-color={pageBackground}
        class:placing
        onpointerdown={onStagePointerDown}
        role="application"
        aria-label={page ? page.title : t('canvas.title')}
      >
        {#if elements.length === 0}
          <div class="empty-stage">
            <Icon name="text" size={26} />
            <strong>{t('canvas.emptyTitle')}</strong>
            <span>{t('canvas.emptyHint')}</span>
          </div>
        {/if}

        {#each elements as element, index (element.id)}
          {#if !element.hidden}
            <div
              class="element element--{element.type}"
              class:selected={session.selectedElementIds.includes(element.id)}
              class:locked={element.locked}
              style={element.type === 'text' ? textStyle(element) : cssVars(element)}
              data-element-id={element.id}
              role="button"
              tabindex="0"
              aria-label={elementName(element, index)}
              aria-pressed={session.selectedElementIds.includes(element.id)}
              onpointerdown={(event) => startDrag(event, element)}
              ondblclick={(event) => startTextEdit(event, element)}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectElement(element.id);
                }
              }}
            >
              {#if element.type === 'text'}
                <div class="text-content">{element.text}</div>
              {:else if element.type === 'image'}
                <CanvasAsset
                  projectId={session.project.id}
                  assetId={element.assetId}
                  fit={element.fit}
                  alt={element.alt}
                  pixelated={element.pixelated}
                  mask={element.mask}
                />
              {:else if element.type === 'video'}
                <CanvasVideo
                  projectId={session.project.id}
                  assetId={element.assetId}
                  fit={element.fit}
                  muted={element.muted}
                  loop={element.loop}
                />
              {:else if element.type === 'audio'}
                <CanvasAudio
                  projectId={session.project.id}
                  assetId={element.assetId}
                  label={element.label}
                  loop={element.loop}
                />
              {:else if element.type === 'embed'}
                <CanvasEmbed
                  provider={element.provider}
                  title={element.title}
                  caption={element.caption}
                  url={element.url}
                />
              {:else if element.type === 'shape'}
                <ShapeArt
                  shape={element.shape}
                  fill={element.fill}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                />
              {:else if element.type === 'ficha'}
                <CanvasFicha
                  projectId={session.project.id}
                  record={session.project.fichas?.[element.fichaId]}
                  asset={session.project.assets?.[
                    session.project.fichas?.[element.fichaId]?.assetId
                  ]}
                />
              {:else}
                <div class="text-content">{t('canvas.unsupported')}</div>
              {/if}
            </div>
          {/if}
        {/each}

        {#if primary}
          <div class="selection" class:locked={primary.locked} style={cssVars(primary)}>
            <button
              type="button"
              class="handle h-nw"
              aria-label={t('canvas.resize')}
              onpointerdown={(event) => startResize(event, 'nw')}
            ></button>
            <button
              type="button"
              class="handle h-n"
              aria-label={t('canvas.resize')}
              onpointerdown={(event) => startResize(event, 'n')}
            ></button>
            <button
              type="button"
              class="handle h-ne"
              aria-label={t('canvas.resize')}
              onpointerdown={(event) => startResize(event, 'ne')}
            ></button>
            <button
              type="button"
              class="handle h-e"
              aria-label={t('canvas.resize')}
              onpointerdown={(event) => startResize(event, 'e')}
            ></button>
            <button
              type="button"
              class="handle h-se"
              aria-label={t('canvas.resize')}
              onpointerdown={(event) => startResize(event, 'se')}
            ></button>
            <button
              type="button"
              class="handle h-s"
              aria-label={t('canvas.resize')}
              onpointerdown={(event) => startResize(event, 's')}
            ></button>
            <button
              type="button"
              class="handle h-sw"
              aria-label={t('canvas.resize')}
              onpointerdown={(event) => startResize(event, 'sw')}
            ></button>
            <button
              type="button"
              class="handle h-w"
              aria-label={t('canvas.resize')}
              onpointerdown={(event) => startResize(event, 'w')}
            ></button>
            <span class="rotate-line"></span>
            <button
              type="button"
              class="rotate-handle"
              aria-label={t('canvas.rotate')}
              onpointerdown={startRotate}
            ></button>
          </div>
        {/if}

        {#if editor.guides.x !== null}
          <span
            class="guide guide--x"
            style:left={`${(editor.guides.x / stage.width) * 100}%`}
          ></span>
        {/if}
        {#if editor.guides.y !== null}
          <span
            class="guide guide--y"
            style:top={`${(editor.guides.y / stage.height) * 100}%`}
          ></span>
        {/if}

        {#if editing}
          <textarea
            class="text-edit"
            bind:this={textarea}
            bind:value={editor.textDraft}
            style={`${textStyle(editing)};background:${textEditorBackground(editing.color)};caret-color:${editing.color}`}
            onpointerdown={(event) => event.stopPropagation()}
            onkeydown={handleTextKeydown}
            onblur={commitText}
            aria-label={t('canvas.editText')}></textarea>
        {/if}
      </div>
    </div>
  </div>

  <div class="stage-foot">
    <span>{Math.round(stage.width)} × {Math.round(stage.height)}</span>
    <span>{plural(elements.length, 'units.elementOne', 'units.elementMany')}</span>
    <div class="zoom-controls">
      <IconButton
        label={t('canvas.zoomOut')}
        icon="minus"
        size={24}
        iconSize={12}
        variant="ghost"
        onclick={() => setZoom(zoom - 0.1)}
      />
      <span class="zoom-value" aria-live="polite">{Math.round(zoom * 100)}%</span>
      <IconButton
        label={t('canvas.zoomIn')}
        icon="plus"
        size={24}
        iconSize={12}
        variant="ghost"
        onclick={() => setZoom(zoom + 0.1)}
      />
      <button
        type="button"
        class="fit-button"
        class:active={zoom === 1}
        aria-label={t('canvas.fitWidth')}
        title={t('canvas.fitWidth')}
        onclick={fitWidth}
      >
        {t('canvas.fitWidth')}
      </button>
    </div>
    <span class="page-index">
      {String(
        Math.max(
          0,
          session.project?.pages.findIndex((item) => item.id === page?.id) ?? 0
        ) + 1
      ).padStart(2, '0')}
      / {String(session.project?.pages.length ?? 0).padStart(2, '0')}
    </span>
  </div>
</section>

<style>
  .desk {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--motif-desk);
  }

  .stage-wrap {
    flex: 1;
    min-height: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--line-soft) transparent;
  }

  .stage-pad {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .stage.placing {
    cursor: crosshair;
  }

  .stage {
    position: relative;
    overflow: hidden;
    border: 0;
    background: var(--stage-color);
    box-shadow: inset 0 0 0 var(--border-strong) var(--line), var(--shadow-stage);
    container-type: size;
    touch-action: none;
    user-select: none;
  }

  .element {
    position: absolute;
    left: var(--x);
    top: var(--y);
    z-index: var(--z);
    width: var(--w);
    height: var(--h);
    transform: rotate(var(--rot));
    opacity: var(--opacity);
    cursor: grab;
  }

  .element:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .element.selected {
    outline: 2px solid var(--selection);
    outline-offset: 0;
  }

  .element.locked {
    cursor: not-allowed;
  }

  .element.locked.selected {
    outline-style: dashed;
  }

  .text-content {
    width: 100%;
    height: auto;
    overflow: visible;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    pointer-events: none;
  }

  .element--image,
  .element--video {
    overflow: hidden;
  }

  .element--audio {
    overflow: visible;
  }

  .element--embed {
    overflow: hidden;
  }

  .element--shape {
    overflow: visible;
  }

  .element--ficha {
    overflow: visible;
  }

  .selection {
    position: absolute;
    left: var(--x);
    top: var(--y);
    z-index: 100;
    width: var(--w);
    height: var(--h);
    transform: rotate(var(--rot));
    border: 2px solid var(--selection);
    pointer-events: none;
  }

  .selection.locked .handle,
  .selection.locked .rotate-handle,
  .selection.locked .rotate-line {
    display: none;
  }

  .handle {
    position: absolute;
    padding: 0;
    width: 9px;
    height: 9px;
    border: 2px solid var(--line);
    background: var(--panel-2);
    pointer-events: auto;
  }

  .h-nw {
    left: -5px;
    top: -5px;
    cursor: nwse-resize;
  }
  .h-n {
    left: 50%;
    top: -5px;
    margin-left: -4px;
    cursor: ns-resize;
  }
  .h-ne {
    right: -5px;
    top: -5px;
    cursor: nesw-resize;
  }
  .h-e {
    right: -5px;
    top: 50%;
    margin-top: -4px;
    cursor: ew-resize;
  }
  .h-se {
    right: -5px;
    bottom: -5px;
    cursor: nwse-resize;
  }
  .h-s {
    left: 50%;
    bottom: -5px;
    margin-left: -4px;
    cursor: ns-resize;
  }
  .h-sw {
    left: -5px;
    bottom: -5px;
    cursor: nesw-resize;
  }
  .h-w {
    left: -5px;
    top: 50%;
    margin-top: -4px;
    cursor: ew-resize;
  }

  .rotate-line {
    position: absolute;
    left: 50%;
    top: -26px;
    width: 1px;
    height: 24px;
    background: var(--selection);
    pointer-events: none;
  }

  .rotate-handle {
    position: absolute;
    padding: 0;
    left: 50%;
    top: -34px;
    width: 12px;
    height: 12px;
    margin-left: -6px;
    border: 2px solid var(--line);
    border-radius: 50%;
    background: var(--accent);
    pointer-events: auto;
    cursor: grab;
  }

  .guide {
    position: absolute;
    z-index: 90;
    background: var(--guide);
    pointer-events: none;
  }

  .guide--x {
    top: 0;
    bottom: 0;
    width: 1px;
  }

  .guide--y {
    left: 0;
    right: 0;
    height: 1px;
  }

  .text-edit {
    position: absolute;
    left: var(--x);
    top: var(--y);
    z-index: 200;
    width: var(--w);
    height: var(--h);
    transform: rotate(var(--rot));
    margin: 0;
    border: 2px solid var(--selection);
    outline: none;
    resize: none;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: inherit;
    background-color: var(--panel);
  }

  .empty-stage {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    color: var(--muted);
    pointer-events: none;
    text-align: center;
  }

  .empty-stage strong {
    color: var(--ink);
    font-family: var(--font-wordmark);
    font-size: var(--text-xl);
    font-weight: var(--wordmark-weight);
  }

  .empty-stage span {
    max-width: 32ch;
    font-size: var(--text-xs);
    line-height: 1.4;
  }

  .stage-foot {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: 0 var(--space-4) var(--space-3);
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
  }

  .zoom-value {
    min-width: 42px;
    color: var(--ink-2);
    font-size: var(--text-2xs);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .fit-button {
    height: 24px;
    padding: 0 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-3xs);
    text-transform: lowercase;
    white-space: nowrap;
  }

  .fit-button:hover,
  .fit-button.active {
    border-color: var(--line);
    color: var(--ink);
  }

  .page-index {
    margin-left: 0;
  }
</style>
