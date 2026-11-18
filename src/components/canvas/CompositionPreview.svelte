<script>
  import { onDestroy } from 'svelte';
  import CompositionView from './CompositionView.svelte';
  import {
    interactiveFrameId,
    normaliseComposition
  } from '../../lib/domain/composition.js';

  let { project, composition, aspect = 1, play = false } = $props();
  const data = $derived(normaliseComposition(composition));
  const isButton = $derived(data.preset === 'button');
  let activeFrameId = $state('');
  let timer = null;

  $effect(() => {
    activeFrameId = data.frames[0].id;
    clearTimeout(timer);
    timer = null;
    if (data.preset !== 'animation' || (!play && !data.timeline.autoplay)) return;
    if (data.frames.length < 2) return;
    let index = 0;
    const tick = () => {
      if (!data.timeline.loop && index >= data.frames.length - 1) return;
      index = (index + 1) % data.frames.length;
      activeFrameId = data.frames[index].id;
      timer = setTimeout(tick, data.frames[index].duration);
    };
    timer = setTimeout(tick, data.frames[0].duration);
    return () => {
      clearTimeout(timer);
      timer = null;
    };
  });

  onDestroy(() => clearTimeout(timer));
</script>

{#if isButton}
  <div class="composition-preview">
    <div class="preview-frame preview-frame--idle">
      <CompositionView {project} {composition} frameId={interactiveFrameId(data, 'idle')} {aspect} />
    </div>
    <div class="preview-frame preview-frame--hover">
      <CompositionView {project} {composition} frameId={interactiveFrameId(data, 'hover')} {aspect} />
    </div>
    <div class="preview-frame preview-frame--pressed">
      <CompositionView {project} {composition} frameId={interactiveFrameId(data, 'pressed')} {aspect} />
    </div>
  </div>
{:else}
  <div class="composition-preview">
    <CompositionView {project} {composition} frameId={activeFrameId} {aspect} />
  </div>
{/if}

<style>
  .composition-preview {
    position: relative;
    width: 100%;
    height: 100%;
    outline: none;
    cursor: inherit;
    container-type: size;
  }
  .preview-frame {
    position: absolute;
    inset: 0;
    display: none;
  }
  .preview-frame--idle {
    display: block;
  }
  .composition-preview:hover .preview-frame--idle {
    display: none;
  }
  .composition-preview:hover .preview-frame--hover {
    display: block;
  }
  .composition-preview:active .preview-frame--idle,
  .composition-preview:active .preview-frame--hover {
    display: none;
  }
  .composition-preview:active .preview-frame--pressed {
    display: block;
  }
</style>
