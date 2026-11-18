<script>
  import AssetThumb from './AssetThumb.svelte';
  import ShapeArt from '../canvas/ShapeArt.svelte';
  import CompositionView from '../canvas/CompositionView.svelte';
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
    <div
      class="mini-el"
      style={camera(element)}
      title={elementName(element)}
    >
      {#if element.type === 'image' || element.type === 'drawing' || element.type === 'video' || element.type === 'ficha'}
        {@const asset = imageAsset(element)}
        {#if asset}
          <AssetThumb
            {asset}
            projectId={project.id}
            mask={element.type === 'image' || element.type === 'drawing' ? element.mask : []}
            maskCurve={element.maskCurve}
            fit={element.fit ?? 'contain'}
          />
        {:else}
          <span class="mini-empty"></span>
        {/if}
        {#if element.type === 'video'}
          <span class="mini-play"><Icon name="play" size={9} /></span>
        {/if}
      {:else if element.type === 'audio'}
        <span class="mini-badge mini-badge--audio" title={element.label || imageAsset(element)?.name || 'audio'}>
          <Icon name="sound" size={10} />
        </span>
      {:else if element.type === 'text'}
        <span class="mini-text" style={textStyle(element)}>{element.text}</span>
      {:else if element.type === 'shape'}
        <ShapeArt
          shape={element.shape}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          radius={element.radius}
          aspect={element.frame.w / element.frame.h}
        />
      {:else if element.type === 'composition'}
        <CompositionView project={project} composition={element.composition} frameId={element.composition?.frames?.[0]?.id} aspect={element.frame.w / element.frame.h} />
      {:else if element.type === 'fichaCollection'}
        <span class="mini-collection">
          {#each Object.values(project?.fichas ?? {}).slice(0, 6) as record (record.id)}
            {#if project?.assets?.[record.assetId]}
              <AssetThumb asset={project.assets[record.assetId]} projectId={project.id} />
            {:else}
              <i></i>
            {/if}
          {/each}
        </span>
      {:else if element.type === 'html'}
        <span class="mini-badge mini-badge--insert"><Icon name="html" size={11} /></span>
      {:else if element.type === 'embed'}
        <span class="mini-badge mini-badge--insert">
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
  .mini-badge {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
    container-type: size;
    color: var(--ink);
    background: var(--panel-2);
  }
  .mini-badge :global(svg) {
    width: min(58cqw, 58cqh);
    height: min(58cqw, 58cqh);
  }
  .mini-badge--insert {
    background: var(--panel);
    border: 1px solid var(--line-soft);
  }
  .mini-badge--audio {
    background: var(--panel-2);
  }
  .mini-play {
    position: absolute;
    left: 50%;
    top: 50%;
    display: grid;
    place-items: center;
    width: 14px;
    height: 14px;
    background: color-mix(in srgb, var(--ink) 78%, transparent);
    color: var(--panel);
    transform: translate(-50%, -50%);
  }
  .mini-collection {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    width: 100%;
    height: 100%;
    padding: 3px;
    background: var(--ficha-bg, #fffdf7);
  }
  .mini-collection :global(.asset-thumb) {
    width: 100%;
    height: 100%;
    min-height: 0;
    border: 0;
  }
  .mini-collection i {
    display: block;
    background: var(--ficha-accent, var(--line));
    opacity: 0.35;
  }

  .mini-empty {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--panel-3);
  }
</style>
