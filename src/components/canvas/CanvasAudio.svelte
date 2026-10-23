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
  let currentTime = $state(0);
  let duration = $state(0);

  $effect(() => {
    const key = `${projectId}:${assetId}`;
    let cancelled = false;
    if (loadedKey !== key) {
      loadedKey = key;
      url = null;
      failed = false;
      playing = false;
      currentTime = 0;
      duration = 0;
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

  function fmt(value) {
    if (!Number.isFinite(value)) return '0:00';
    const total = Math.max(0, Math.floor(value));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  const progress = $derived(duration ? Math.min(100, (currentTime / duration) * 100) : 0);

  function toggle(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  function seek(event) {
    if (!audio || !duration) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    audio.currentTime =
      Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * duration;
  }
</script>

<div class="audio">
  <audio
    bind:this={audio}
    src={url}
    preload="metadata"
    onplay={() => (playing = true)}
    onpause={() => (playing = false)}
    onended={() => (playing = false)}
    ontimeupdate={(event) => (currentTime = event.currentTarget.currentTime)}
    onloadedmetadata={(event) => (duration = event.currentTarget.duration)}
  ></audio>
  {#if url}
    <button
      type="button"
      class="audio-play"
      aria-label={playing ? t('media.pause') : t('media.play')}
      title={playing ? t('media.pause') : t('media.play')}
      onpointerdown={(event) => event.stopPropagation()}
      onclick={toggle}
    >
      <span>{playing ? '❚❚' : '▶'}</span>
    </button>
    <div class="audio-copy">
      <span class="audio-label">{label}</span>
      <div class="audio-line">
        <button
          type="button"
          class="audio-bar"
          aria-label={t('media.seek')}
          onpointerdown={(event) => event.stopPropagation()}
          onclick={seek}
        ><i style:width={`${progress}%`}></i></button>
        <span class="audio-time">{fmt(currentTime)} / {fmt(duration)}</span>
      </div>
    </div>
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
    gap: 1.8cqw;
    width: 100%;
    height: 100%;
    padding: 1.5cqw 2cqw;
    border: 1px solid #24303f;
    background: #fffdf7;
    color: #24303f;
    font: 1.6cqw/1.2 'Space Mono', monospace;
    overflow: hidden;
  }

  audio {
    display: none;
  }

  .audio-play {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 5cqw;
    height: 5cqw;
    min-width: 26px;
    min-height: 26px;
    padding: 0;
    border: 0;
    background: currentColor;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .audio-play span {
    color: #fffdf7;
  }

  .audio-copy {
    display: flex;
    flex-direction: column;
    gap: 0.7cqw;
    min-width: 0;
    flex: 1;
  }

  .audio-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .audio-line {
    display: flex;
    align-items: center;
    gap: 1cqw;
  }

  .audio-bar {
    position: relative;
    display: block;
    flex: 1;
    height: 2px;
    padding: 0;
    border: 0;
    background: color-mix(in srgb, currentColor 22%, transparent);
    cursor: pointer;
  }

  .audio-bar i {
    display: block;
    height: 100%;
    background: currentColor;
  }

  .audio-time {
    font-size: 1.2cqw;
    opacity: 0.72;
    white-space: nowrap;
  }

  .missing,
  .loading {
    display: grid;
    place-items: center;
    gap: 0.8cqw;
    width: 100%;
    height: 100%;
    color: #6b6257;
    font-size: 1.6cqw;
  }

  .loading {
    background: #f6f0e4;
  }
</style>
