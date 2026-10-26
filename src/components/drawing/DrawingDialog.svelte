<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import { saveDrawingInProject, session } from '../../lib/state/project.svelte.js';
  import {
    DRAWING_DELAY,
    DRAWING_HEIGHT,
    DRAWING_WIDTH,
    addStroke,
    clearDrawing,
    createDrawing,
    normalizeDrawing,
    paletteColors,
    paletteRgb,
    renderFrameIndices,
    frameToRgba
  } from '../../lib/drawing/model.js';

  let { open = $bindable(false), element = null } = $props();
  let drawing = $state(createDrawing());
  let animated = $state(true);
  let tool = $state('brush');
  let paint = $state(1);
  let size = $state(2);
  let frame = $state(0);
  let history = $state([]);
  let drawingNow = $state(false);
  let saving = $state(false);
  let canvasEl = $state(null);

  const palette = $derived(session.project?.palette ?? []);
  const colors = $derived(paletteColors(palette));
  const canUndo = $derived(history.length > 0);

  $effect(() => {
    if (!open) return;
    const source = element?.drawingId
      ? session.project?.drawings?.[element.drawingId]
      : null;
    const next = normalizeDrawing(source) ?? createDrawing({ animated: true });
    drawing = next;
    animated = next.animated !== false;
    frame = 0;
    tool = 'brush';
    paint = 1;
    size = 2;
    history = [];
    saving = false;
    drawingNow = false;
  });

  $effect(() => {
    if (!open || !canvasEl) return;
    drawFrame(frame);
  });

  $effect(() => {
    if (!open || !animated) return;
    const timer = setInterval(() => {
      frame = (frame + 1) % 3;
    }, DRAWING_DELAY * 10);
    return () => clearInterval(timer);
  });

  function drawFrame(index) {
    if (!canvasEl) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;
    const indices = renderFrameIndices(drawing, index);
    const rgb = paletteRgb(colors);
    const image = context.createImageData(DRAWING_WIDTH, DRAWING_HEIGHT);
    for (let index = 0; index < indices.length; index += 1) {
      const color = rgb[indices[index]] || rgb[0];
      const offset = index * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }

  function pointFromEvent(event) {
    const rect = canvasEl?.getBoundingClientRect();
    if (!rect?.width) return [0, 0];
    return [
      Math.max(
        0,
        Math.min(
          DRAWING_WIDTH - 1,
          Math.floor(((event.clientX - rect.left) / rect.width) * DRAWING_WIDTH)
        )
      ),
      Math.max(
        0,
        Math.min(
          DRAWING_HEIGHT - 1,
          Math.floor(((event.clientY - rect.top) / rect.height) * DRAWING_HEIGHT)
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

  function pointerDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    canvasEl?.setPointerCapture(event.pointerId);
    pushHistory();
    const point = pointFromEvent(event);
    drawing = addStroke(drawing, {
      id: `s${Date.now().toString(36)}-${drawing.strokes.length + 1}`,
      tool,
      paint,
      size,
      points: [point],
      seed: randomSeed()
    });
    drawingNow = true;
  }

  function pointerMove(event) {
    if (!drawingNow) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const strokes = drawing.strokes.slice();
    const last = strokes[strokes.length - 1];
    if (!last) return;
    const previous = last.points[last.points.length - 1];
    if (previous[0] === point[0] && previous[1] === point[1]) return;
    strokes[strokes.length - 1] = { ...last, points: [...last.points, point] };
    drawing = { ...drawing, strokes };
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
    frame = 0;
  }

  function clear() {
    if (!drawing.strokes.length) return;
    pushHistory();
    drawing = clearDrawing(drawing);
    frame = 0;
  }

  function toggleAnimated(event) {
    animated = event.currentTarget.checked;
    drawing = {
      ...drawing,
      animated,
      frames: animated ? 3 : 1,
      delay: animated ? DRAWING_DELAY : 0
    };
    frame = 0;
  }

  function makeCanvas(sizeValue) {
    const canvas = document.createElement('canvas');
    canvas.width = sizeValue;
    canvas.height = sizeValue;
    return canvas;
  }

  function canvasBlob(canvas, type) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No image'))), type);
    });
  }

  function frameBlob(sizeValue) {
    const canvas = makeCanvas(sizeValue);
    const context = canvas.getContext('2d');
    const indices = renderFrameIndices(drawing, 0);
    const rgba = frameToRgba(indices, colors, sizeValue);
    const image = context.createImageData(sizeValue, sizeValue);
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
      const mime = animated ? 'image/gif' : 'image/png';
      let blob;
      if (animated) {
        const { encodeDrawingGif } = await import('../../lib/drawing/encode.js');
        blob = dataUrlBlob(
          encodeDrawingGif(source, { projectColors: colors, outputSize: 1024 }).image
        );
      } else {
        blob = await frameBlob(1024);
      }
      const thumb = await frameBlob(512);
      await saveDrawingInProject({
        elementId: element?.id ?? null,
        drawingId: element?.drawingId ?? null,
        drawing: source,
        blob,
        thumb,
        mime,
        name: animated ? 'dibujo.gif' : 'dibujo.png',
        alt: element?.alt || t('drawing.alt')
      });
      open = false;
      toast(t('drawing.saved'), 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      saving = false;
    }
  }
</script>

<Dialog bind:open title={element ? t('drawing.edit') : t('drawing.title')} wide>
  <div class="drawing-dialog">
    <div class="drawing-preview">
      <canvas
        bind:this={canvasEl}
        width={DRAWING_WIDTH}
        height={DRAWING_HEIGHT}
        style:background={colors[0]}
        onpointerdown={pointerDown}
        onpointermove={pointerMove}
        onpointerup={pointerUp}
        onpointercancel={pointerUp}
        aria-label={t('drawing.canvas')}
      ></canvas>
      <p class="hint">{t('drawing.hint')}</p>
    </div>

    <aside class="drawing-controls">
      <section>
        <span class="mono-label">{t('drawing.tool')}</span>
        <div class="tools">
          {#each [['brush', 'drawing.brush'], ['texture', 'drawing.texture'], ['eraser', 'drawing.eraser']] as [value, label] (value)}
            <Button
              size="sm"
              variant={tool === value ? 'accent' : 'secondary'}
              onclick={() => (tool = value)}
            >
              {t(label)}
            </Button>
          {/each}
        </div>
      </section>

      <section>
        <span class="mono-label">{t('drawing.size')}</span>
        <div class="size-row">
          <input type="range" min="1" max="6" step="1" bind:value={size} />
          <span>{size}</span>
        </div>
      </section>

      <section>
        <span class="mono-label">{t('drawing.color')}</span>
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
      </section>

      <section>
        <label class="check">
          <input type="checkbox" checked={animated} onchange={toggleAnimated} />
          <span>{t('drawing.animated')}</span>
        </label>
        <p class="hint">{animated ? t('drawing.animatedHint') : t('drawing.staticHint')}</p>
      </section>

      <div class="actions">
        <Button size="sm" variant="ghost" onclick={undo} disabled={!canUndo}>
          <Icon name="undo" size={12} />{t('drawing.undo')}
        </Button>
        <Button size="sm" variant="ghost" onclick={clear} disabled={!drawing.strokes.length}>
          <Icon name="trash" size={12} />{t('drawing.clear')}
        </Button>
      </div>
    </aside>
  </div>

  <div class="drawing-footer">
    <Button size="sm" variant="ghost" onclick={() => (open = false)} disabled={saving}>
      {t('common.cancel')}
    </Button>
    <Button size="sm" variant="accent" onclick={save} disabled={saving || !drawing.strokes.length}>
      {saving ? t('drawing.saving') : t('drawing.save')}
    </Button>
  </div>
</Dialog>

<style>
  .drawing-dialog {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
    align-items: flex-start;
    max-width: 820px;
    margin: 0 auto;
  }
  .drawing-preview {
    flex: 0 1 520px;
    width: 100%;
    max-width: 520px;
    min-width: 0;
  }
  canvas {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    border: 1px solid var(--line);
    image-rendering: pixelated;
    touch-action: none;
    cursor: crosshair;
  }
  .hint {
    margin: var(--space-2) 0 0;
    max-width: 520px;
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
  .drawing-controls {
    flex: 0 1 270px;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .drawing-controls section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .tools {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
  .size-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .size-row input {
    flex: 1;
    accent-color: var(--selection);
  }
  .swatches {
    display: flex;
    gap: var(--space-2);
  }
  .swatch {
    width: 30px;
    height: 30px;
    padding: 0;
    border: 2px solid var(--line);
    cursor: pointer;
  }
  .swatch.active {
    outline: 3px solid var(--selection);
    outline-offset: 2px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ink);
    font-size: var(--text-xs);
  }
  .check input {
    accent-color: var(--selection);
  }
  .actions,
  .drawing-footer {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .drawing-footer {
    justify-content: flex-end;
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line-soft);
  }
  @media (max-width: 760px) {
    .drawing-dialog {
      flex-direction: column;
      max-width: 520px;
    }
    .drawing-preview {
      flex-basis: auto;
      max-width: 100%;
    }
    .drawing-controls {
      flex-basis: auto;
      width: 100%;
    }
  }
</style>
