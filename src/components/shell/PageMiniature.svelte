<script>
  import AssetThumb from './AssetThumb.svelte';
  import ShapeArt from '../canvas/ShapeArt.svelte';
  import Icon from '../ui/Icon.svelte';
  import { elementName, fontStack } from '../../lib/domain/elements.js';

  let { project, page } = $props();
  const stage = $derived(project?.stage ?? { width: 1200, height: 800 });
  const elements = $derived(
    [...(page?.elements ?? [])]
      .filter((element) => !element.hidden)
      .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
  );

  function camera(element) {
    return [
      `left:${(element.frame.x / stage.width) * 100}%`,
      `top:${(element.frame.y / stage.height) * 100}%`,
      `width:${(element.frame.w / stage.width) * 100}%`,
      `height:${(element.frame.h / stage.height) * 100}%`,
      `transform:rotate(${element.frame.rotation ?? 0}deg)`,
      `opacity:${element.opacity ?? 1}`,
      `z-index:${element.z ?? 0}`
    ].join(';');
  }

  function imageAsset(element) {
    if (element.type === 'ficha') {
      return project?.assets?.[project?.fichas?.[element.fichaId]?.assetId];
    }
    return project?.assets?.[element.assetId];
  }

  function textStyle(element) {
    const toCqw = (value) => `${(Number(value) || 0) / stage.width * 100}cqw`;
    return [
      `color:${element.color}`,
      `background:${element.background || 'transparent'}`,
      `text-align:${element.align}`,
      `font-family:${fontStack(project, element.font)}`,
      `font-size:${toCqw(element.fontSize)}`,
      `line-height:${element.lineHeight ?? 1.05}`,
      `letter-spacing:${toCqw(element.letterSpacing)}`,
      `padding:${toCqw(element.padding)}`,
      `font-weight:${element.heading ? 700 : 400}`
    ].join(';');
  }
</script>

<div
  class="miniature"
  aria-hidden="true"
  style:background={page?.background?.color ?? stage.background?.color ?? '#fffdf7'}
>
  <div
    class="miniature-stage"
    style={`width:min(100cqw, calc(100cqh * ${stage.width / stage.height}));aspect-ratio:${stage.width}/${stage.height};background:${page?.background?.color ?? stage.background?.color ?? '#fffdf7'}`}
  >
  {#each elements as element (element.id)}
    <div class="mini-el" style={camera(element)} title={elementName(element)}>
      {#if element.type === 'image' || element.type === 'video' || element.type === 'ficha'}
        {@const asset = imageAsset(element)}
        {#if asset}
          <AssetThumb
            {asset}
            projectId={project.id}
            mask={element.type === 'image' ? element.mask : []}
            fit={element.fit ?? 'cover'}
          />
        {:else if element.type === 'video'}
          <span class="mini-icon"><Icon name="video" size={12} /></span>
        {:else}
          <span class="mini-empty"></span>
        {/if}
      {:else if element.type === 'audio'}
        <span class="mini-audio">
          <b>▶</b>
          <span>{element.label || imageAsset(element)?.name || 'audio'}</span>
          <i></i>
        </span>
      {:else if element.type === 'text'}
        <span class="mini-text" style={textStyle(element)}>{element.text}</span>
      {:else if element.type === 'shape'}
        <ShapeArt
          shape={element.shape}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      {:else if element.type === 'embed'}
        <span class="mini-icon mini-embed">
          <Icon name={element.provider === 'observable' ? 'chart' : element.provider === 'p5' ? 'code' : 'play'} size={11} />
        </span>
      {/if}
    </div>
  {/each}
  </div>
</div>

<style>
  .miniature {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--stage);
    container-type: size;
  }
  .miniature-stage {
    position: relative;
    overflow: hidden;
    container-type: size;
  }
  .mini-el {
    position: absolute;
    overflow: hidden;
    transform-origin: center;
  }
  .mini-el :global(.asset-thumb),
  .mini-el :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .mini-el :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .mini-text {
    display: block;
    width: 100%;
    height: 100%;
    overflow: hidden;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .mini-icon {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: var(--ink);
    background: var(--panel-2);
  }
  .mini-embed {
    background: var(--panel);
    border: 1px solid var(--line-soft);
  }
  .mini-empty {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--panel-3);
  }
  .mini-audio {
    display: flex;
    align-items: center;
    gap: 4cqw;
    width: 100%;
    height: 100%;
    padding: 3cqw;
    overflow: hidden;
    border: 1px solid currentColor;
    background: #fffdf7;
    color: #24303f;
    font-size: 4cqw;
  }
  .mini-audio b {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 8cqw;
    height: 8cqw;
    background: currentColor;
    color: #fffdf7;
    font-size: 3cqw;
  }
  .mini-audio span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mini-audio i {
    flex: 1;
    height: 1px;
    background: currentColor;
    opacity: 0.35;
  }
</style>
