<script>
  import Icon from '../ui/Icon.svelte';
  import { assetUrl } from '../../lib/state/asset-urls.svelte.js';
  import { maskClipPath } from '../../lib/domain/mask.js';

  let { projectId, assetId, fit = 'cover', alt = '', pixelated = false, mask = [] } = $props();
  const clip = $derived(maskClipPath(mask));
  let url = $state(null);
  let failed = $state(false);
  let loadedKey = $state('');

  $effect(() => {
    const key = `${projectId}:${assetId}`;
    let cancelled = false;

    if (loadedKey !== key) {
      loadedKey = key;
      url = null;
      failed = false;
    }

    assetUrl(projectId, assetId)
      .then((next) => {
        if (!cancelled && next) url = next;
      })
      .catch(() => {
        if (!cancelled) failed = true;
      });

    return () => {
      cancelled = true;
    };
  });
</script>

{#if url}
  <img
    src={url}
    {alt}
    draggable="false"
    style:object-fit={clip ? 'contain' : fit}
    style:image-rendering={pixelated ? 'pixelated' : 'auto'}
    style:clip-path={clip || null}
  />
{:else if failed}
  <span class="missing"><Icon name="image" size={24} /> {alt || 'imagen'}</span>
{:else}
  <span class="loading" aria-hidden="true"></span>
{/if}

<style>
  img {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
  }

  .missing,
  .loading {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    background: var(--panel-3);
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .loading {
    background:
      linear-gradient(90deg, transparent, var(--panel-3), transparent) 0 0 / 200% 100%,
      var(--panel-3);
    animation: shimmer 1.2s linear infinite;
  }

  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
</style>
