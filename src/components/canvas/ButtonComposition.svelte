<script>
  import ShapeArt from './ShapeArt.svelte';
  import CanvasAsset from './CanvasAsset.svelte';
  import { fontStack } from '../../lib/domain/elements.js';
  import { buttonChildStyle, buttonState, normaliseButton } from '../../lib/domain/button.js';

  let {
    project,
    button,
    state = 'idle',
    fallback = true,
    selectedId = null,
    editable = false,
    onselect = null
  } = $props();

  const children = $derived(
    fallback ? buttonState(button, state) : (normaliseButton(button).states[state] ?? [])
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

<div class="button-composition" class:editable>
  {#each children as child (child.id)}
    <div
      class="button-child"
      class:selected={selectedId === child.id}
      style={buttonChildStyle(child)}
      role={editable ? 'button' : 'presentation'}
      onpointerdown={(event) => {
        if (!editable) return;
        event.preventDefault();
        event.stopPropagation();
        onselect?.(child.id, event);
      }}
    >
      {#if child.type === 'shape'}
        <ShapeArt
          shape={child.shape}
          fill={child.fill}
          stroke={child.stroke}
          strokeWidth={child.strokeWidth}
          radius={child.radius}
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
        <span class="button-text" style={textStyle(child)}>{child.text}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .button-composition {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    container-type: size;
    pointer-events: none;
  }
  .button-composition.editable {
    pointer-events: auto;
  }
  .button-child {
    position: absolute;
    overflow: hidden;
  }
  .button-child.selected {
    outline: 2px solid var(--selection);
    outline-offset: -1px;
    cursor: grab;
  }
  .button-child:active {
    cursor: grabbing;
  }
  .button-child :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .button-text {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
</style>
