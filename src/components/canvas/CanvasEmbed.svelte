<script>
  import Icon from '../ui/Icon.svelte';
  import { embedProvider, embedSrc } from '../../lib/domain/embeds.js';

  let { provider = 'youtube', title = '', caption = '', url = '' } = $props();
  const meta = $derived(embedProvider(provider));
  const icon = $derived(provider === 'observable' ? 'chart' : provider === 'p5' ? 'code' : 'play');
  const src = $derived(embedSrc({ provider, url }));
  const live = $derived(Boolean(src && (provider === 'observable' || provider === 'p5')));
</script>

<div class="embed-card" class:embed-card--live={live}>
  {#if live}
    <iframe
      src={src}
      title={caption ? `${title || meta?.label}: ${caption}` : title || meta?.label}
      sandbox={meta?.sandbox ?? 'allow-scripts allow-same-origin'}
      allow={meta?.allow ?? ''}
      referrerpolicy={provider === 'p5' ? 'strict-origin-when-cross-origin' : 'no-referrer'}
      loading="lazy"
    ></iframe>
    <span class="live-badge">{meta?.label ?? provider}</span>
  {:else}
    <span class="provider">
      <Icon name={icon} size={13} />
      {meta?.label ?? provider}
    </span>
    <strong>{title || meta?.label || 'Embed'}</strong>
    {#if caption}<span class="caption">{caption}</span>{/if}
    <span class="url">{url}</span>
  {/if}
</div>

<style>
  .embed-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    width: 100%;
    height: 100%;
    padding: 12px;
    overflow: hidden;
    border: 1px dashed var(--line);
    background: linear-gradient(135deg, var(--panel-2), var(--panel-3));
    color: var(--ink);
  }

  .embed-card--live {
    padding: 0;
    border-style: solid;
    background: #fff;
  }

  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
    pointer-events: none;
  }

  .live-badge {
    position: absolute;
    right: 6px;
    bottom: 6px;
    padding: 2px 5px;
    background: var(--ink);
    color: var(--panel);
    font-size: var(--text-3xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    pointer-events: none;
  }

  .provider {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    align-self: flex-start;
    color: var(--muted);
    font-size: var(--text-2xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  strong {
    overflow: hidden;
    font-family: var(--font-wordmark);
    font-size: var(--text-lg);
    font-weight: var(--wordmark-weight);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .caption {
    overflow: hidden;
    color: var(--ink-2);
    font-size: var(--text-2xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .url {
    overflow: hidden;
    color: var(--muted);
    font-size: var(--text-3xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
