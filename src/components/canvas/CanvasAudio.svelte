<script>
  import Icon from '../ui/Icon.svelte';
  import { assetUrl } from '../../lib/state/asset-urls.svelte.js';
  import { t } from '../../lib/i18n/index.svelte.js';

  let { projectId, assetId, label = '', loop = false } = $props();
  let audio = $state(null);
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
    if (audio) audio.loop = loop;
  });

  function toggle(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }
</script>

<div class="audio">
  {#if url}
    <audio
      bind:this={audio}
      src={url}
      preload="metadata"
      onplay={() => (playing = true)}
      onpause={() => (playing = false)}
      onended={() => (playing = false)}
    ></audio>
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
    <span class="label">{label}</span>
    <span class="wave" aria-hidden="true"
      ><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span
    >
  {:else if failed}
    <span class="missing"><Icon name="sound" size={22} /> {label || 'audio'}</span>
  {:else}
    <span class="loading" aria-hidden="true"></span>
  {/if}
</div>

<style>
  .audio {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    height: 100%;
    padding: var(--space-2);
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--ink);
    overflow: hidden;
  }

  audio {
    display: none;
  }

  .play {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 0;
    background: var(--panel);
    color: var(--ink);
    cursor: pointer;
  }

  .play:hover {
    background: var(--panel-3);
  }

  .label {
    min-width: 0;
    overflow: hidden;
    font-size: var(--text-2xs);
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wave {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
    height: 22px;
  }

  .wave i {
    display: block;
    width: 2px;
    height: 8px;
    background: var(--muted);
  }

  .wave i:nth-child(2),
  .wave i:nth-child(6) {
    height: 15px;
  }
  .wave i:nth-child(3),
  .wave i:nth-child(5) {
    height: 21px;
  }
  .wave i:nth-child(4) {
    height: 11px;
  }

  .missing,
  .loading {
    display: grid;
    place-items: center;
    gap: var(--space-1);
    width: 100%;
    height: 100%;
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .loading {
    background: var(--panel-3);
    animation: shimmer 1.2s linear infinite;
  }

  @keyframes shimmer {
    50% {
      opacity: 0.45;
    }
  }
</style>
