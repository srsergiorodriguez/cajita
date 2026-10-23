<script>
  let {
    shape = 'circle',
    fill = '#a82a1e',
    stroke = '#1c1917',
    strokeWidth = 0
  } = $props();

  const strokeColor = $derived(Number(strokeWidth) > 0 ? stroke : 'none');
  const width = $derived(Number(strokeWidth) > 0 ? Number(strokeWidth) : 0);
</script>

<svg
  viewBox="0 0 100 100"
  preserveAspectRatio="none"
  aria-hidden="true"
  focusable="false"
  style="display:block;width:100%;height:100%;overflow:visible"
>
  {#if shape === 'square'}
    <rect
      x="0"
      y="0"
      width="100"
      height="100"
      {fill}
      stroke={strokeColor}
      stroke-width={width}
      vector-effect="non-scaling-stroke"
      stroke-linejoin="round"
    />
  {:else if shape === 'triangle'}
    <polygon
      points="50,0 100,100 0,100"
      {fill}
      stroke={strokeColor}
      stroke-width={width}
      vector-effect="non-scaling-stroke"
      stroke-linejoin="round"
    />
  {:else}
    <circle
      cx="50"
      cy="50"
      r="50"
      {fill}
      stroke={strokeColor}
      stroke-width={width}
      vector-effect="non-scaling-stroke"
    />
  {/if}
</svg>
