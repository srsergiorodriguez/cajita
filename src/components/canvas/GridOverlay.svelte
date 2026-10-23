<script>
  import { gridCells } from '../../lib/domain/grid.js';

  let { grid, stage } = $props();
  const layout = $derived(grid && stage ? gridCells(grid, stage) : null);
</script>

{#if layout}
  <svg
    class="grid-overlay"
    viewBox={`0 0 ${stage.width} ${stage.height}`}
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <rect
      x={layout.geometry.x}
      y={layout.geometry.y}
      width={layout.geometry.width}
      height={layout.geometry.height}
      class="grid-margin"
    />
    {#each layout.cells as cell (cell.x + ':' + cell.y)}
      <rect
        x={cell.px}
        y={cell.py}
        width={cell.pw}
        height={cell.ph}
        class="grid-cell"
      />
    {/each}
  </svg>
{/if}

<style>
  .grid-overlay {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }
  .grid-margin {
    fill: none;
    stroke: var(--selection);
    stroke-width: 1.5;
    stroke-dasharray: 7 5;
    opacity: 0.55;
  }
  .grid-cell {
    fill: none;
    stroke: var(--selection);
    stroke-width: 0.7;
    opacity: 0.28;
  }
</style>
