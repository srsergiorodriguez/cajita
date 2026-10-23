<script>
  import Icon from '../ui/Icon.svelte';
  import { embedProvider } from '../../lib/domain/embeds.js';

  let { provider = 'youtube', title = '', caption = '', url = '' } = $props();
  const meta = $derived(embedProvider(provider));
  const icon = $derived(provider === 'observable' ? 'chart' : provider === 'p5' ? 'code' : 'play');
</script>

<div class="embed-card">
  <span class="provider">
    <Icon name={icon} size={13} />
    {meta?.label ?? provider}
  </span>
  <strong>{title || meta?.label || 'Embed'}</strong>
  {#if caption}<span class="caption">{caption}</span>{/if}
  <span class="url">{url}</span>
</div>

<style>
  .embed-card {
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
