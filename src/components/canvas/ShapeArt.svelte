<script>
  import { shapeMarkup } from '../../lib/domain/shapes.js';

  let {
    shape = 'circle',
    fill = '#a82a1e',
    stroke = '#1c1917',
    strokeWidth = 0,
    radius = 0
  } = $props();

  const markup = $derived(shapeMarkup({ shape, fill, stroke, strokeWidth, radius }));
</script>

<svg
  viewBox="0 0 100 100"
  preserveAspectRatio="none"
  aria-hidden="true"
  focusable="false"
  style="display:block;width:100%;height:100%;overflow:visible"
>
  {@html markup}
</svg>
