<script>
  import CompositionView from '../canvas/CompositionView.svelte';

  let {
    project,
    composition,
    frames = [],
    aspect = 1,
    opacity = 0.13,
    types = null
  } = $props();
</script>

{#if frames.length}
  <div class="onion-skin" aria-hidden="true">
    {#each frames as frame, index (frame.id)}
      <div class="onion-frame" style:opacity={opacity / (index + 1)}>
        <CompositionView {project} {composition} frameId={frame.id} {aspect} {types} />
      </div>
    {/each}
  </div>
{/if}

<style>
  .onion-skin {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    filter: grayscale(1);
  }

  .onion-frame {
    position: absolute;
    inset: 0;
  }
</style>
