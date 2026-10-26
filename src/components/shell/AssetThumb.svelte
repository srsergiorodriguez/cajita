<script>
  import { thumbUrl } from '../../lib/state/asset-urls.svelte.js';
  import Icon from '../ui/Icon.svelte';
  import { maskClipPath } from '../../lib/domain/mask.js';

  let { asset, projectId, mask = [], maskCurve = false, fit = 'cover' } = $props();
  const clip = $derived(maskClipPath(mask, maskCurve));
  let url = $state(null);
  let loadedKey = $state('');

  $effect(() => {
    const key = `${projectId}:${asset?.id ?? ''}`;
    let cancelled = false;

    if (loadedKey !== key) {
      loadedKey = key;
      url = null;
    }

    if (projectId && asset) {
      thumbUrl(projectId, asset.id)
        .then((next) => {
          if (!cancelled && next) url = next;
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  });
</script>

<div class="asset-thumb" class:has-image={Boolean(url)} class:has-mask={Boolean(clip)} style:clip-path={clip || null}>
  {#if url}
    <img src={url} alt={asset.name} loading="lazy" />
  {:else}
    <Icon
      name={asset.kind === 'image'
        ? 'image'
        : asset.kind === 'video'
          ? 'video'
          : asset.kind === 'audio'
            ? 'sound'
            : 'text'}
      size={20}
    />
    <span>{asset.kind}</span>
  {/if}
</div>

<style>
  .asset-thumb {
    position: relative;
    display: grid;
    place-items: center;
    gap: 2px;
    aspect-ratio: 1;
    overflow: hidden;
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--muted);
  }

  .asset-thumb span {
    font-size: var(--text-3xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: var(--asset-fit, cover);
  }

  .asset-thumb.has-mask img {
    object-fit: contain;
  }

  .asset-thumb.has-image {
    border-color: var(--line);
  }
</style>
