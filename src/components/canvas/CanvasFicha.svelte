<script>
  import CanvasAsset from './CanvasAsset.svelte';

  let { projectId, record, asset, showCode = true } = $props();
</script>

{#if asset}
  <CanvasAsset
    {projectId}
    assetId={asset.id}
    fit="cover"
    alt={record?.alt || record?.label || ''}
    pixelated={false}
  />
{:else}
  <div class="ficha-empty">
    <span>ficha</span>
    <strong>{record?.label || 'Ficha'}</strong>
  </div>
{/if}

{#if showCode && record?.code}
  <span class="ficha-badge">{record.code}</span>
{/if}

<style>
  .ficha-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 100%;
    padding: 12px;
    border: 2px dashed var(--line);
    background: var(--panel-2);
    text-align: center;
  }

  .ficha-empty span {
    color: var(--muted);
    font-size: var(--text-3xs);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .ficha-empty strong {
    font-family: var(--font-wordmark);
    font-size: var(--text-lg);
    line-height: 1.05;
  }

  .ficha-badge {
    position: absolute;
    right: 4px;
    bottom: 4px;
    padding: 1px 4px;
    background: var(--panel);
    border: 1px solid var(--line);
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: var(--text-3xs);
    line-height: 1.2;
  }
</style>
