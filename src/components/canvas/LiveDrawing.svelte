<script>
  import { frameToRgba, paletteColors, renderFrameIndices, DRAWING_FRAMES, DRAWING_DEFAULT_FRAME_MS } from '../../lib/drawing/model.js';

  let {
    project = null,
    drawingId = '',
    fit = 'contain',
    alt = '',
    pixelated = false
  } = $props();

  let canvasEl = $state(null);
  let frame = $state(0);
  const drawing = $derived(project?.drawings?.[drawingId] ?? null);
  const colors = $derived(paletteColors(project?.palette ?? []));
  const width = $derived(drawing?.width || 128);
  const height = $derived(drawing?.height || 128);
  const authored = $derived(drawing?.animation?.frames ?? []);
  const wiggle = $derived(drawing?.animated !== false ? DRAWING_FRAMES : 1);
  const total = $derived(
    authored.length ? authored.length * wiggle : drawing?.frames === 1 ? 1 : DRAWING_FRAMES
  );

  function durationFor(index) {
    if (!authored.length) return DRAWING_DEFAULT_FRAME_MS;
    return authored[Math.floor(index / wiggle)]?.duration ?? DRAWING_DEFAULT_FRAME_MS;
  }

  $effect(() => {
    if (!drawing || drawing.animated === false || total < 2) {
      frame = 0;
      return;
    }
    let current = 0;
    let timer;
    const tick = () => {
      frame = current;
      current = (current + 1) % total;
      timer = setTimeout(tick, durationFor(current));
    };
    tick();
    return () => clearTimeout(timer);
  });

  $effect(() => {
    colors;
    frame;
    drawing;
    if (!canvasEl || !drawing) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;
    const indices = renderFrameIndices(drawing, frame);
    const rgba = frameToRgba(
      indices,
      project.palette,
      width,
      height,
      width,
      height,
      null,
      drawing.transparent === true
    );
    context.putImageData(new ImageData(rgba, width, height), 0, 0);
  });
</script>

<canvas
  bind:this={canvasEl}
  width={width}
  height={height}
  aria-label={alt}
  role={alt ? 'img' : undefined}
  style:object-fit={fit}
  style:image-rendering={pixelated ? 'pixelated' : undefined}
></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
