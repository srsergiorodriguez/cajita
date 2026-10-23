<script>
  import Icon from '../ui/Icon.svelte';
  import { assetUrl } from '../../lib/state/asset-urls.svelte.js';
  import { t } from '../../lib/i18n/index.svelte.js';

  let { projectId, assetId, fit = 'cover', muted = true, loop = false } = $props();
  let video = $state(null);
  let url = $state(null);
  let failed = $state(false);
  let playing = $state(false);
  let loadedKey = $state('');

  $effect(() => {
    const key = `${projectId}:${assetId}`;
    let cancelled = false;
    if (loadedKey !== key) {
      loadedKey = key;
      url = null;
      failed = false;
      playing = false;
    }
    assetUrl(projectId, assetId)
      .then((next) => {
        if (!cancelled && next) url = next;
        else if (!cancelled) failed = true;
      })
      .catch(() => {
        if (!cancelled) failed = true;
      });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (!video) return;
    video.muted = muted;
    video.loop = loop;
  });

  function toggle(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }
</script>

<div class="video">
  {#if url}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
      bind:this={video}
      src={url}
      playsinline
      preload="metadata"
      style:object-fit={fit}
      onplay={() => (playing = true)}
      onpause={() => (playing = false)}
      onended={() => (playing = false)}
    ></video>
    <button
      type="button"
      class="play"
      aria-label={playing ? t('media.pause') : t('media.play')}
      title={playing ? t('media.pause') : t('media.play')}
      onpointerdown={(event) => event.stopPropagation()}
      onclick={toggle}
    >
      <Icon name={playing ? 'pause' : 'play'} size={16} />
    </button>
  {:else if failed}
    <span class="missing"><Icon name="video" size={24} /> video</span>
  {:else}
    <span class="loading" aria-hidden="true"></span>
  {/if}
</div>

<style>
  .video {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--panel-3);
  }

  video {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
  }

  .play {
    position: absolute;
    left: var(--space-2);
    bottom: var(--space-2);
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 0;
    background: var(--panel-2);
    color: var(--ink);
    cursor: pointer;
  }

  .play:hover {
    background: var(--panel-3);
  }

  .missing,
  .loading {
    display: grid;
    place-items: center;
    gap: var(--space-1);
    width: 100%;
    height: 100%;
    background: var(--panel-3);
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .loading {
    animation: shimmer 1.2s linear infinite;
  }

  @keyframes shimmer {
    50% {
      opacity: 0.45;
    }
  }
</style>
