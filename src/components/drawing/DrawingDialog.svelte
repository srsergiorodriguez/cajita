<script>
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import StudioShell from '../studio/StudioShell.svelte';
  import ZoomableViewport from '../studio/ZoomableViewport.svelte';
  import FrameTimeline from '../studio/FrameTimeline.svelte';
  import StudioToolbar from '../studio/StudioToolbar.svelte';
  import IconButton from '../ui/IconButton.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import Section from '../ui/Section.svelte';
  import Field from '../ui/Field.svelte';
  import { untrack } from 'svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import { saveDrawingInProject, session } from '../../lib/state/project.svelte.js';
  import {
    DRAWING_DEFAULT_FRAME_MS,
    DRAWING_DEFAULT_POSE_MS,
    DRAWING_DELAY,
    DRAWING_FRAMES,
    DRAWING_HEIGHT,
    DRAWING_MAX_BRUSH,
    DRAWING_MAX_FRAMES,
    DRAWING_MAX_SIZE,
    DRAWING_MIN_SIZE,
    DRAWING_OUTPUT_SIZE,
    DRAWING_WIDTH,
    createDrawing,
    normalizeDrawing,
    paletteColors,
    renderFrameIndices,
    frameToRgba
  } from '../../lib/drawing/model.js';

  let {
    open = $bindable(false),
    element = null,
    drawingId = null,
    alt = '',
    placement = 'page',
    onsaved = null
  } = $props();
  let drawing = $state(createDrawing({ animated: true }));
  let tool = $state('brush');
  let paint = $state(1);
  let size = $state(2);
  let frame = $state(0);
  let history = $state([]);
  let drawingNow = $state(false);
  let saving = $state(false);
  let playing = $state(false);
  let previewFrame = $state(0);
  let wiggleVariant = $state(0);
  let wiggleOn = $state(true);
  let onion = $state(false);
  let canvasEl = $state(null);
  let onionEl = $state(null);

  const editingDrawingId = $derived(element?.drawingId ?? drawingId ?? null);
  const editing = $derived(Boolean(editingDrawingId));
  const palette = $derived(session.project?.palette ?? []);
  const colors = $derived(paletteColors(palette));
  const canvasWidth = $derived(drawing.width || DRAWING_WIDTH);
  const canvasHeight = $derived(drawing.height || DRAWING_HEIGHT);
  const canvasAspect = $derived(canvasWidth / canvasHeight);
  const animation = $derived(drawing.animation ?? null);
  const frameCount = $derived(animation?.frames?.length ?? 1);
  const wiggleCount = $derived(drawing.animated !== false ? DRAWING_FRAMES : 1);
  const activeFrame = $derived(animation?.frames?.[frame] ?? null);
  const frameDuration = $derived(
    animation?.frames?.[0]?.duration ?? DRAWING_DEFAULT_FRAME_MS
  );
  const totalFrames = $derived(
    animation
      ? frameCount * wiggleCount
      : drawing.animated !== false
        ? DRAWING_FRAMES
        : 1
  );
  const displayFrame = $derived(
    playing
      ? previewFrame
      : animation
        ? frame * wiggleCount + (drawing.animated !== false ? wiggleVariant % wiggleCount : 0)
        : drawing.animated !== false
          ? wiggleVariant % wiggleCount
          : 0
  );
  const activeStrokes = $derived(animation ? animation.frames[frame]?.strokes ?? [] : drawing.strokes);
  const hasContent = $derived(
    animation ? animation.frames.some((item) => item.strokes.length) : drawing.strokes.length > 0
  );
  const canUndo = $derived(history.length > 0);

  $effect(() => {
    if (!open) return;
    const source = editingDrawingId
      ? session.project?.drawings?.[editingDrawingId]
      : null;
    const next = normalizeDrawing(source) ?? createDrawing({ animated: true });
    drawing = next;
    frame = 0;
    playing = false;
    wiggleVariant = 0;
    wiggleOn = next.animated !== false;
    onion = false;
    tool = 'brush';
    paint = 1;
    size = 2;
    history = [];
    saving = false;
    drawingNow = false;
  });

  $effect(() => {
    if (!open || !canvasEl) return;
    drawFrame(displayFrame);
    if (onion && onionEl) drawOnion();
  });

  function previewDelay(index) {
    if (!animation) return DRAWING_DEFAULT_FRAME_MS;
    const pose = Math.floor(index / wiggleCount);
    return Math.max(
      20,
      Math.round(
        (animation.frames[pose]?.duration || DRAWING_DEFAULT_POSE_MS) / wiggleCount,
      ),
    );
  }

  $effect(() => {
    if (!open || !playing || totalFrames < 2) return;
    let current = untrack(() => previewFrame);
    let timer;
    const tick = () => {
      current = (current + 1) % totalFrames;
      previewFrame = current;
      timer = setTimeout(tick, previewDelay(current));
    };
    timer = setTimeout(tick, previewDelay(current));
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (!open || playing || !wiggleOn) return;
    const timer = setInterval(() => {
      wiggleVariant = (wiggleVariant + 1) % DRAWING_FRAMES;
    }, DRAWING_DEFAULT_FRAME_MS);
    return () => clearInterval(timer);
  });

  function drawFrame(index) {
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;
    const indices = renderFrameIndices(drawing, index);
    const rgba = frameToRgba(
      indices,
      colors,
      canvasWidth,
      canvasHeight,
      canvasWidth,
      canvasHeight,
      null,
      drawing.transparent === true
    );
    context.putImageData(new ImageData(rgba, canvasWidth, canvasHeight), 0, 0);
  }

  function drawOnion() {
    if (!onionEl) return;
    const context = onionEl.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!onion || !animation || frameCount < 2 || playing) return;
    const previous = (frame - 1 + frameCount) % frameCount;
    const next = (frame + 1) % frameCount;
    const ghost = document.createElement('canvas');
    ghost.width = canvasWidth;
    ghost.height = canvasHeight;
    const ghostContext = ghost.getContext('2d');
    if (!ghostContext) return;
    const paint = (index, opacity) => {
      const rgba = frameToRgba(
        renderFrameIndices(drawing, index * wiggleCount),
        colors,
        canvasWidth,
        canvasHeight,
        canvasWidth,
        canvasHeight,
        null,
        drawing.transparent === true
      );
      const image = ghostContext.createImageData(canvasWidth, canvasHeight);
      image.data.set(rgba);
      ghostContext.putImageData(image, 0, 0);
      context.globalAlpha = opacity;
      context.drawImage(ghost, 0, 0);
    };
    paint(previous, 0.16);
    if (next !== previous) paint(next, 0.08);
    context.globalAlpha = 1;
  }

  function pointFromEvent(event) {
    const rect = canvasEl?.getBoundingClientRect();
    if (!rect?.width) return [0, 0];
    return [
      Math.max(
        0,
        Math.min(
          canvasWidth - 1,
          Math.floor(((event.clientX - rect.left) / rect.width) * canvasWidth)
        )
      ),
      Math.max(
        0,
        Math.min(
          canvasHeight - 1,
          Math.floor(((event.clientY - rect.top) / rect.height) * canvasHeight)
        )
      )
    ];
  }

  function randomSeed() {
    return (
      (Math.floor(Math.random() * 0xffffffff) ^
        Math.floor(performance.now())) >>>
      0
    );
  }

  function pushHistory() {
    history = [...history.slice(-11), structuredClone($state.snapshot(drawing))];
  }

  function withActiveStrokes(strokes) {
    if (!drawing.animation) return { ...drawing, strokes };
    const frames = drawing.animation.frames.map((item, index) =>
      index === frame ? { ...item, strokes } : item
    );
    return {
      ...drawing,
      animation: { ...drawing.animation, frames },
      frames,
    };
  }

  function defaultFrameDuration() {
    return wiggleOn ? DRAWING_DEFAULT_POSE_MS : DRAWING_DEFAULT_FRAME_MS;
  }

  function withAnimationFrames(frames) {
    if (!drawing.animation) return drawing;
    const normalised = frames.map((item) => ({
      ...item,
      duration: Math.max(20, Math.min(10000, Number(item.duration) || defaultFrameDuration()))
    }));
    const nextFrame = Math.min(frame, normalised.length - 1);
    frame = nextFrame;
    return {
      ...drawing,
      animation: { ...drawing.animation, frames: normalised },
      frames: normalised.length,
      delay: drawing.animation.delay
    };
  }

  function frameId() {
    return `f${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function updateAllFrameDurations(value) {
    if (!drawing.animation) return;
    const duration = Math.max(20, Math.min(10000, Number(value) || frameDuration));
    const frames = drawing.animation.frames.map((item) => ({ ...item, duration }));
    drawing = { ...drawing, animation: { ...drawing.animation, frames } };
  }

  function toggleWiggle(event) {
    const enabled = event.currentTarget.checked;
    playing = false;
    wiggleVariant = 0;
    wiggleOn = enabled;
    drawing = {
      ...drawing,
      animated: enabled,
      frames: drawing.animation ? drawing.frames : enabled ? DRAWING_FRAMES : 1,
      delay: enabled ? DRAWING_DELAY : 0
    };
  }

  function togglePlayback() {
    if (playing) {
      playing = false;
      previewFrame = 0;
      return;
    }
    previewFrame = animation ? frame * wiggleCount : 0;
    playing = true;
  }

  function toggleTransparent(event) {
    drawing = { ...drawing, transparent: event.currentTarget.checked };
  }

  function selectFrame(value) {
    const index =
      typeof value === 'number'
        ? value
        : drawing.animation?.frames.findIndex((item) => item.id === value) ?? -1;
    if (index < 0 || index >= frameCount) return;
    frame = index;
    playing = false;
    wiggleVariant = 0;
  }

  function reorderFrames(fromId, toId) {
    if (!drawing.animation) return;
    const frames = drawing.animation.frames.slice();
    const from = frames.findIndex((item) => item.id === fromId);
    const to = frames.findIndex((item) => item.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = frames.splice(from, 1);
    frames.splice(to, 0, moved);
    drawing = withAnimationFrames(frames);
    frame = to;
  }

  function addFrame() {
    if (!drawing.animation || frameCount >= DRAWING_MAX_FRAMES) return;
    pushHistory();
    drawing = withAnimationFrames([
      ...drawing.animation.frames,
      { id: frameId(), strokes: [], duration: frameDuration }
    ]);
    frame = drawing.animation.frames.length - 1;
  }

  function duplicateFrame() {
    if (!drawing.animation || frameCount >= DRAWING_MAX_FRAMES) return;
    pushHistory();
    const copy = structuredClone($state.snapshot(drawing.animation.frames[frame]));
    copy.id = frameId();
    copy.duration = Math.max(20, Number(copy.duration) || defaultFrameDuration());
    drawing = withAnimationFrames([...drawing.animation.frames, copy]);
    frame = drawing.animation.frames.length - 1;
  }

  function removeFrame() {
    if (!drawing.animation || drawing.animation.frames.length <= 2) return;
    pushHistory();
    drawing = withAnimationFrames(drawing.animation.frames.filter((_, index) => index !== frame));
  }

  function pointerDown(event) {
    if (event.button !== 0) return;
    playing = false;
    event.preventDefault();
    canvasEl?.setPointerCapture(event.pointerId);
    pushHistory();
    const point = pointFromEvent(event);
    drawing = withActiveStrokes([
      ...activeStrokes,
      {
        id: `s${Date.now().toString(36)}-${activeStrokes.length + 1}`,
        tool,
        paint,
        size,
        points: [point],
        seed: randomSeed()
      }
    ]);
    drawingNow = true;
  }

  function pointerMove(event) {
    if (!drawingNow) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const strokes = activeStrokes.slice();
    const last = strokes[strokes.length - 1];
    if (!last) return;
    const previous = last.points[last.points.length - 1];
    if (previous[0] === point[0] && previous[1] === point[1]) return;
    strokes[strokes.length - 1] = { ...last, points: [...last.points, point] };
    drawing = withActiveStrokes(strokes);
  }

  function pointerUp(event) {
    if (!drawingNow) return;
    drawingNow = false;
    try {
      canvasEl?.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be gone.
    }
  }

  function undo() {
    if (!history.length) return;
    drawing = history[history.length - 1];
    history = history.slice(0, -1);
    frame = Math.min(frame, (drawing.animation?.frames?.length ?? 1) - 1);
    playing = false;
    wiggleOn = drawing.animated !== false;
  }

  function clear() {
    if (!activeStrokes.length) return;
    pushHistory();
    drawing = withActiveStrokes([]);
  }

  function setAnimationMode(enabled) {
    playing = false;
    if (enabled) {
      const animated = wiggleOn;
      const strokes = structuredClone($state.snapshot(drawing.strokes));
      const duration = defaultFrameDuration();
      drawing = {
        ...drawing,
        animated,
        frames: 2,
        delay: DRAWING_DELAY,
        animation: {
          frames: [
            { id: frameId(), strokes, duration },
            { id: frameId(), strokes: [], duration }
          ],
          delay: DRAWING_DELAY
        }
      };
      frame = 0;
    } else {
      const strokes = structuredClone($state.snapshot(activeStrokes));
      const { animation: _removed, ...rest } = drawing;
      const wiggle = rest.animated !== false;
      drawing = {
        ...rest,
        strokes,
        animated: wiggle,
        frames: wiggle ? DRAWING_FRAMES : 1,
        delay: wiggle ? DRAWING_DELAY : 0
      };
      frame = 0;
      playing = false;
      wiggleOn = wiggle;
      onion = false;
    }
  }

  function scaleStrokes(strokes, sx, sy) {
    return strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => [point[0] * sx, point[1] * sy])
    }));
  }

  function resizeDrawing(nextWidth, nextHeight) {
    const width = Math.max(DRAWING_MIN_SIZE, Math.min(DRAWING_MAX_SIZE, Math.round(Number(nextWidth) || canvasWidth)));
    const height = Math.max(DRAWING_MIN_SIZE, Math.min(DRAWING_MAX_SIZE, Math.round(Number(nextHeight) || canvasHeight)));
    if (width === canvasWidth && height === canvasHeight) return;
    const sx = width / canvasWidth;
    const sy = height / canvasHeight;
    pushHistory();
    playing = false;
    const animation = drawing.animation
      ? {
          ...drawing.animation,
          frames: drawing.animation.frames.map((item) => ({
            ...item,
            strokes: scaleStrokes(item.strokes, sx, sy)
          }))
        }
      : undefined;
    drawing = {
      ...drawing,
      width,
      height,
      strokes: scaleStrokes(drawing.strokes, sx, sy),
      ...(animation ? { animation } : {})
    };
  }

  function outputDimensions(maxSize) {
    const ratio = canvasWidth / canvasHeight;
    return ratio >= 1
      ? [maxSize, Math.max(1, Math.round(maxSize / ratio))]
      : [Math.max(1, Math.round(maxSize * ratio)), maxSize];
  }

  function makeCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function canvasBlob(canvas, type) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No image'))), type);
    });
  }

  function frameBlob(maxSize) {
    const [width, height] = outputDimensions(maxSize);
    const canvas = makeCanvas(width, height);
    const context = canvas.getContext('2d');
    const indices = renderFrameIndices(drawing, 0);
    const rgba = frameToRgba(indices, colors, width, height, canvasWidth, canvasHeight, null, drawing.transparent === true);
    const image = context.createImageData(width, height);
    image.data.set(rgba);
    context.putImageData(image, 0, 0);
    return canvasBlob(canvas, 'image/png');
  }

  function dataUrlBlob(dataUrl) {
    const [head, body] = dataUrl.split(',');
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: head.match(/data:(.*?);/)?.[1] ?? 'image/gif' });
  }

  async function save() {
    if (saving) return;
    saving = true;
    try {
      const source = structuredClone($state.snapshot(drawing));
      const animated = Boolean(source.animation) || source.animated === true;
      const mime = animated ? 'image/gif' : 'image/png';
      const [exportWidth, exportHeight] = outputDimensions(DRAWING_OUTPUT_SIZE);
      let blob;
      if (animated) {
        const { encodeDrawingGif } = await import('../../lib/drawing/encode.js');
        blob = dataUrlBlob(
          encodeDrawingGif(source, { projectColors: colors, outputSize: DRAWING_OUTPUT_SIZE }).image
        );
      } else {
        blob = await frameBlob(DRAWING_OUTPUT_SIZE);
      }
      const thumb = await frameBlob(512);
      const result = await saveDrawingInProject({
        elementId: placement === 'page' ? element?.id ?? null : null,
        drawingId: editingDrawingId,
        drawing: source,
        blob,
        thumb,
        mime,
        name: animated ? 'dibujo.gif' : 'dibujo.png',
        width: exportWidth,
        height: exportHeight,
        alt: element?.alt || alt || t('drawing.alt'),
        placeOnPage: placement === 'page'
      });
      onsaved?.(result);
      open = false;
      toast(t('drawing.saved'), 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      saving = false;
    }
  }
</script>

<StudioShell bind:open title={editing ? t('drawing.edit') : t('drawing.title')}>
  {#snippet toolbar()}
    <StudioToolbar>
      {#snippet lead()}
        <SegmentedControl
          label={t('drawing.mode')}
          value={animation ? 'animation' : 'static'}
          options={[
            { value: 'static', label: t('drawing.static') },
            { value: 'animation', label: t('drawing.animation') }
          ]}
          onchange={(value) => setAnimationMode(value === 'animation')}
        />
      {/snippet}
      {#snippet actions()}
        {#if animation}
          <span class="frame-count">{frame + 1}/{DRAWING_MAX_FRAMES}</span>
          <IconButton label={t('drawing.addFrame')} icon="plus" size={24} iconSize={12} variant="ghost" disabled={frameCount >= DRAWING_MAX_FRAMES} onclick={addFrame} />
          <IconButton label={t('drawing.duplicateFrame')} icon="duplicate" size={24} iconSize={12} variant="ghost" disabled={frameCount >= DRAWING_MAX_FRAMES} onclick={duplicateFrame} />
          <IconButton label={t('drawing.removeFrame')} icon="trash" size={24} iconSize={12} variant="ghost" disabled={frameCount <= 2} onclick={removeFrame} />
          <label class="duration-field">
            <span>{t('drawing.duration')}</span>
            <input
              type="number"
              min="20"
              max="10000"
              step="10"
              value={frameDuration}
              onchange={(event) => updateAllFrameDurations(event.currentTarget.value)}
            />
            <span>ms</span>
          </label>
        {/if}
        {#if animation && totalFrames > 1}
          <IconButton
            label={playing ? t('drawing.pause') : t('drawing.play')}
            icon={playing ? 'pause' : 'play'}
            size={24}
            iconSize={12}
            variant={playing ? 'default' : 'ghost'}
            onclick={togglePlayback}
          />
        {/if}
        {#if animation}
          <IconButton
            label={t('drawing.onion')}
            icon="onion"
            size={24}
            iconSize={12}
            variant={onion ? 'default' : 'ghost'}
            onclick={() => (onion = !onion)}
          />
        {/if}
      {/snippet}
    </StudioToolbar>
  {/snippet}
  {#snippet canvas()}
    <ZoomableViewport aspect={canvasAspect} height="min(62vh, 520px)" fitMode="page">
      <div class="drawing-surface" class:transparent={drawing.transparent}>
        <canvas
          class="drawing-canvas"
          bind:this={canvasEl}
          width={canvasWidth}
          height={canvasHeight}
          style:background={drawing.transparent ? 'transparent' : colors[0]}
          onpointerdown={pointerDown}
          onpointermove={pointerMove}
          onpointerup={pointerUp}
          onpointercancel={pointerUp}
          aria-label={t('drawing.canvas')}
        ></canvas>
        {#if onion}
          <canvas
            class="drawing-onion"
            bind:this={onionEl}
            width={canvasWidth}
            height={canvasHeight}
            aria-hidden="true"
          ></canvas>
        {/if}
      </div>
    </ZoomableViewport>
  {/snippet}

  {#snippet timeline()}
    {#if animation}
      <FrameTimeline
        frames={animation.frames}
        activeFrameId={activeFrame?.id ?? ''}
        labelFor={(item) => String(animation.frames.indexOf(item) + 1)}
        durationLabel={(item) => `${Math.max(20, Number(item.duration) || DRAWING_DEFAULT_FRAME_MS)}ms`}
        onselect={selectFrame}
        onreorder={reorderFrames}
      />
    {/if}
  {/snippet}

  {#snippet properties()}
    <Section label={t('drawing.tool')}>
      <div class="tools">
        {#each [['brush', 'drawing.brush', 'pencil'], ['line', 'drawing.line', 'line'], ['spray', 'drawing.spray', 'spray'], ['chalk', 'drawing.chalk', 'chalk'], ['texture', 'drawing.texture', 'grid'], ['eraser', 'drawing.eraser', 'trash']] as [value, label, icon] (value)}
          <Button
            size="sm"
            variant={tool === value ? 'accent' : 'secondary'}
            onclick={() => (tool = value)}
            title={t(label)}
          >
            <Icon name={icon} size={12} />{t(label)}
          </Button>
        {/each}
      </div>
    </Section>

    <Section label={t('drawing.size')}>
      <div class="size-row">
        <input type="range" min="1" max={DRAWING_MAX_BRUSH} step="1" bind:value={size} aria-label={t('drawing.size')} />
        <span class="size-value">{size}</span>
      </div>
    </Section>

    <Section label={t('drawing.color')}>
      <div class="swatches">
        {#each colors.slice(1) as color, index (color)}
          <button
            type="button"
            class="swatch"
            class:active={paint === index + 1}
            style:background={color}
            aria-label={t('drawing.colorNumber', { number: index + 1 })}
            aria-pressed={paint === index + 1}
            onclick={() => (paint = index + 1)}
          ></button>
        {/each}
      </div>
    </Section>

    <Section label={t('drawing.canvasSize')}>
      <div class="grid-2">
        <Field label={t('drawing.width')} type="number" min={DRAWING_MIN_SIZE} max={DRAWING_MAX_SIZE} value={canvasWidth} onchange={(event) => resizeDrawing(event.currentTarget.value, canvasHeight)} />
        <Field label={t('drawing.height')} type="number" min={DRAWING_MIN_SIZE} max={DRAWING_MAX_SIZE} value={canvasHeight} onchange={(event) => resizeDrawing(canvasWidth, event.currentTarget.value)} />
      </div>
    </Section>

    <Section label={t('drawing.settings')}>
      <div class="compact-settings">
        <label class="check">
          <input type="checkbox" checked={drawing.transparent === true} onchange={toggleTransparent} />
          <span>{t('drawing.transparent')}</span>
        </label>
        <label class="check">
          <input type="checkbox" checked={wiggleOn} onchange={toggleWiggle} />
          <span>{t('drawing.wiggle')}</span>
        </label>
        <div class="actions">
          <Button size="sm" variant="ghost" onclick={undo} disabled={!canUndo}>
            <Icon name="undo" size={12} />{t('drawing.undo')}
          </Button>
          <Button size="sm" variant="ghost" onclick={clear} disabled={!activeStrokes.length}>
            <Icon name="trash" size={12} />{t('drawing.clear')}
          </Button>
        </div>
      </div>
    </Section>
  {/snippet}

  {#snippet footer()}
    <Button size="sm" variant="ghost" onclick={() => (open = false)} disabled={saving}>
      {t('common.cancel')}
    </Button>
    <Button size="sm" variant="accent" onclick={save} disabled={saving || !hasContent}>
      {saving ? t('drawing.saving') : t('drawing.save')}
    </Button>
  {/snippet}
</StudioShell>

<style>
  .drawing-surface {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .drawing-onion {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    image-rendering: pixelated;
    pointer-events: none;
  }
  .frame-count { color: var(--muted); font-family: var(--font-ui); font-size: var(--text-2xs); font-variant-numeric: tabular-nums; }
  .duration-field { display: inline-flex; align-items: center; gap: 3px; color: var(--muted); font-family: var(--font-ui); font-size: var(--text-2xs); }
  .duration-field input { width: 62px; height: 24px; padding: 0 4px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font: inherit; text-align: right; }
  .drawing-canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    border: 1px solid var(--line);
    image-rendering: pixelated;
    touch-action: none;
    cursor: crosshair;
  }
  .tools { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-1); }
  .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-1); }
  .size-row { display: flex; align-items: center; gap: var(--space-2); }
  .size-row input { flex: 1; min-width: 0; accent-color: var(--selection); }
  .size-value { min-width: 1ch; color: var(--muted); font-size: var(--text-2xs); font-variant-numeric: tabular-nums; }
  .drawing-surface.transparent { background: repeating-conic-gradient(var(--panel-3) 0 25%, var(--panel-2) 0 50%) 0 0 / 12px 12px; }
  .swatches { display: flex; gap: var(--space-2); }
  .swatch { width: 30px; height: 30px; padding: 0; border: 2px solid var(--line); cursor: pointer; }
  .swatch.active { outline: 3px solid var(--selection); outline-offset: 1px; }
</style>
