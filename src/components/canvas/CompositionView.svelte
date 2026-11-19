<script>
  import ShapeArt from './ShapeArt.svelte';
  import CanvasAsset from './CanvasAsset.svelte';
  import LiveDrawing from './LiveDrawing.svelte';
  import { fontStack } from '../../lib/domain/elements.js';
  import { compositionChildStyle, frameById } from '../../lib/domain/composition.js';

  let {
    project,
    composition,
    frameId = null,
    selectedId = null,
    editable = false,
    aspect = 1,
    types = null,
    onselect = null,
    onedit = null
  } = $props();

  const frame = $derived(frameById(composition, frameId));
  const children = $derived(
    (frame?.children ?? []).filter(
      (child) => !child.hidden && (!types || types.includes(child.type))
    )
  );

  function textStyle(child) {
    return [
      `font-family:${fontStack(project, child.font)}`,
      `font-size:${child.fontSize}cqw`,
      `line-height:${child.lineHeight}`,
      `letter-spacing:${child.letterSpacing}cqw`,
      `padding:${child.padding}cqw`,
      `color:${child.color}`,
      `background:${child.background || 'transparent'}`,
      `text-align:${child.align}`,
      `justify-content:${child.align === 'center' ? 'center' : child.align === 'right' ? 'flex-end' : 'flex-start'}`,
      `font-weight:${child.heading ? 700 : 400}`
    ].join(';');
  }
</script>

<div class="composition-view" class:editable>
  {#each children as child (child.id)}
    <div
      class="composition-child"
      class:selected={selectedId === child.id}
      style={compositionChildStyle(child)}
      role={editable ? 'button' : 'presentation'}
      onpointerdown={(event) => {
        if (!editable) return;
        event.preventDefault();
        event.stopPropagation();
        if (!child.locked) onselect?.(child.id, event);
      }}
      ondblclick={(event) => {
        if (!editable || child.type !== 'text' || child.locked) return;
        event.preventDefault();
        event.stopPropagation();
        onedit?.(child.id);
      }}
    >
      {#if child.type === 'shape'}
        <ShapeArt
          shape={child.shape}
          fill={child.fill}
          stroke={child.stroke}
          strokeWidth={child.strokeWidth}
          radius={child.radius}
          aspect={(Number(aspect) || 1) * (child.frame.w / child.frame.h)}
        />
      {:else if child.type === 'drawing' && child.drawingId && project.drawings?.[child.drawingId]}
        <LiveDrawing
          {project}
          drawingId={child.drawingId}
          fit={child.fit}
          alt={child.alt || ''}
          pixelated={child.pixelated}
        />
      {:else if child.type === 'image' || child.type === 'drawing'}
        <CanvasAsset
          projectId={project.id}
          assetId={child.assetId}
          fit={child.fit}
          alt={child.alt || ''}
          pixelated={child.pixelated}
        />
      {:else}
        <span class="composition-text" style={textStyle(child)}>{child.text}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .composition-view {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    container-type: size;
    pointer-events: none;
  }
  .composition-view.editable {
    pointer-events: auto;
  }
  .composition-child {
    position: absolute;
    overflow: hidden;
  }
  .composition-view.editable .composition-child {
    cursor: grab;
  }
  .composition-view.editable .composition-child:active {
    cursor: grabbing;
  }
  .composition-child.selected {
    outline: 2px solid var(--selection);
    outline-offset: -1px;
  }
  .composition-child :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .composition-text {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
</style>
