<script>
  import MotivoShape from "$components/MotivoShape.svelte";
  import { appState } from '$stores/appState.svelte.js';
  let { code, cellSize, palette } = $props();

  let marks = $derived([
    code.slice(0, 6),
    code.slice(6, 12),
    code.slice(12, 18)
  ]);

  let sizes = $derived([
    cellSize * 0.25, 
    cellSize * 0.5, 
    cellSize * 0.75, 
    cellSize
  ]);

  const rotations = [0, 90, 180, 270];

  function getPos(index) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: col * (cellSize / 2),
      y: row * (cellSize / 2)
    };
  }
</script>

<g class="cell-renderer">
  {#each marks as mark}
    {#if mark[0] === "1"}
      {@const shape = parseInt(mark[1])}
      {@const color = parseInt(mark[2])}
      {@const sizeIdx = parseInt(mark[3])}
      {@const posIdx = parseInt(mark[4])}
      {@const rotIdx = parseInt(mark[5])}

      {@const s = sizes[sizeIdx]}
      {@const pos = getPos(posIdx)}
      {@const rot = rotations[rotIdx]}
      
      <g transform="translate({pos.x}, {pos.y}) rotate({rot})" stroke={palette[color]} stroke-width="0.6" stroke-linejoin="miter">
        <MotivoShape shape={shape} color={color} {s} />
      </g>
    {/if}
  {/each}
</g>