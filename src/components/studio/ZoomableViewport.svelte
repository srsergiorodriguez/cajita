<script>
  import ZoomControls from '../canvas/ZoomControls.svelte';
  import { pinchZoom } from '../../lib/actions/pinch-zoom.js';

  let {
    aspect = 1,
    height = 'min(58vh, 520px)',
    gutter = 24,
    topGutter = 44,
    bottomGutter = 26,
    minZoom = 0.25,
    maxZoom = 4,
    zoom = $bindable(1),
    fitMode = $bindable('width'),
    children
  } = $props();

  let scrollEl = $state(null);
  let availableWidth = $state(0);
  let availableHeight = $state(0);

  const ratio = $derived(aspect > 0 ? aspect : 1);
  const baseWidth = $derived(Math.max(120, availableWidth - gutter * 2));
  const stageWidth = $derived(baseWidth * zoom);
  const stageHeight = $derived(stageWidth / ratio);
  const padHeight = $derived(Math.max(availableHeight, stageHeight + topGutter + bottomGutter));

  $effect(() => {
    const node = scrollEl;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      availableWidth = entry.contentRect.width;
      availableHeight = entry.contentRect.height;
    });
    observer.observe(node);
    return () => observer.disconnect();
  });

  function clampZoom(value) {
    return Math.min(maxZoom, Math.max(minZoom, Math.round(value * 100) / 100));
  }

  function zoomIn() {
    zoom = clampZoom(zoom * 1.25);
    fitMode = 'manual';
  }

  function zoomOut() {
    zoom = clampZoom(zoom / 1.25);
    fitMode = 'manual';
  }

  function fitWidth() {
    zoom = 1;
    fitMode = 'width';
  }

  function fitPageZoom() {
    const usableHeight = Math.max(120, availableHeight - topGutter - bottomGutter);
    return clampZoom(Math.min(1, usableHeight / (baseWidth / ratio)));
  }

  function fitPage() {
    zoom = fitPageZoom();
    fitMode = 'page';
  }

  $effect(() => {
    if (!availableWidth || !availableHeight) return;
    if (fitMode === 'width') zoom = 1;
    else if (fitMode === 'page') zoom = fitPageZoom();
  });
</script>

<div class="zoom-viewport" style:height use:pinchZoom={{ onzoom: (factor) => { zoom = clampZoom(zoom * factor); fitMode = 'manual'; } }}>
  <div class="zoom-scroll" bind:this={scrollEl}>
    <div
      class="zoom-pad"
      style:height={`${padHeight}px`}
      style:padding={`${topGutter}px ${gutter}px ${bottomGutter}px`}
    >
      <div class="zoom-stage" style:width={`${stageWidth}px`} style:height={`${stageHeight}px`}>
        {@render children()}
      </div>
    </div>
  </div>
  <div class="zoom-footer">
    <ZoomControls
      {zoom}
      onZoomOut={zoomOut}
      onZoomIn={zoomIn}
      onFitWidth={fitWidth}
      onFitPage={fitPage}
      fitWidthActive={fitMode === 'width'}
      fitPageActive={fitMode === 'page'}
    />
  </div>
</div>

<style>
  .zoom-viewport {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    min-height: 180px;
    overflow: hidden;
    border: 1px solid var(--line-soft);
    background: var(--panel);
  }

  .zoom-scroll {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--line-soft) transparent;
  }

  .zoom-pad {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 100%;
    width: max-content;
  }

  .zoom-stage {
    position: relative;
    flex: 0 0 auto;
  }

  .zoom-footer {
    display: flex;
    align-items: center;
    min-height: 30px;
    padding: 0 var(--space-2);
    border-top: 1px solid var(--line-soft);
    background: var(--panel-2);
  }
</style>
