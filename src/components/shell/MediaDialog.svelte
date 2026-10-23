<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import AssetThumb from './AssetThumb.svelte';
  import { deleteAsset, session } from '../../lib/state/project.svelte.js';
  import { formatBytes } from '../../lib/domain/model.js';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { open = $bindable(false) } = $props();
  let filter = $state('all');
  let search = $state('');
  let selectedId = $state(null);
  let confirmDelete = $state(false);

  const allAssets = $derived.by(() => {
    const seen = new Set();
    return Object.values(session.project?.assets ?? {}).filter((asset) => {
      if (asset.kind === 'font') return false;
      const key = asset.hash || asset.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  const fichaAssets = $derived(
    new Set(
      Object.values(session.project?.fichas ?? {})
        .map((ficha) => ficha.assetId)
        .filter(Boolean)
    )
  );

  const elementUsage = $derived.by(() => {
    const usage = new Map();
    for (const page of session.project?.pages ?? []) {
      for (const element of page.elements ?? []) {
        if (!element.assetId) continue;
        usage.set(element.assetId, (usage.get(element.assetId) ?? 0) + 1);
      }
    }
    return usage;
  });

  const fichaUsage = $derived.by(() => {
    const usage = new Map();
    for (const ficha of Object.values(session.project?.fichas ?? {})) {
      if (!ficha.assetId) continue;
      usage.set(ficha.assetId, (usage.get(ficha.assetId) ?? 0) + 1);
    }
    return usage;
  });

  const filtered = $derived(
    allAssets.filter((asset) => {
      if (filter === 'images' && asset.kind !== 'image') return false;
      if (filter === 'video' && asset.kind !== 'video') return false;
      if (filter === 'audio' && asset.kind !== 'audio') return false;
      if (filter === 'fichas' && !fichaAssets.has(asset.id)) return false;
      if (filter === 'unused') {
        const used = (elementUsage.get(asset.id) ?? 0) + (fichaUsage.get(asset.id) ?? 0);
        if (used) return false;
      }
      const q = search.trim().toLowerCase();
      return !q || asset.name.toLowerCase().includes(q);
    })
  );

  const selected = $derived(
    filtered.find((asset) => asset.id === selectedId) ??
      allAssets.find((asset) => asset.id === selectedId) ??
      null
  );

  const selectedUsage = $derived(
    selected
      ? {
          elements: elementUsage.get(selected.id) ?? 0,
          fichas: fichaUsage.get(selected.id) ?? 0
        }
      : { elements: 0, fichas: 0 }
  );

  const filters = $derived([
    { value: 'all', label: t('media.filterAll') },
    { value: 'images', label: t('media.filterImages') },
    { value: 'video', label: t('media.filterVideo') },
    { value: 'audio', label: t('media.filterAudio') },
    { value: 'fichas', label: t('media.filterFichas') },
    { value: 'unused', label: t('media.filterUnused') }
  ]);

  $effect(() => {
    if (!filtered.some((asset) => asset.id === selectedId)) {
      selectedId = filtered[0]?.id ?? null;
    }
  });

  async function remove() {
    if (!selected || selectedUsage.elements || selectedUsage.fichas) return;
    if (!window.confirm(t('media.deleteConfirm', { name: selected.name }))) return;
    try {
      await deleteAsset(selected.id);
      toast(t('media.deleted'), 'success');
      selectedId = null;
      confirmDelete = false;
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }
</script>

<Dialog bind:open title={t('media.manager')} wide>
  <div class="media-manager">
    <div class="media-toolbar">
      <input bind:value={search} type="search" placeholder={t('media.search')} />
      <div class="filters">
        {#each filters as item (item.value)}
          <button
            type="button"
            class:active={filter === item.value}
            onclick={() => (filter = item.value)}
          >
            {item.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="media-body">
      <div class="media-grid">
        {#each filtered as asset (asset.id)}
          <button
            type="button"
            class="media-card"
            class:active={asset.id === selectedId}
            onclick={() => {
              selectedId = asset.id;
              confirmDelete = false;
            }}
          >
            <AssetThumb {asset} projectId={session.project.id} />
            <span>{asset.name}</span>
            {#if fichaAssets.has(asset.id)}<small>{t('media.usedByFichas')}</small>{/if}
          </button>
        {/each}
      </div>

      <aside class="media-detail">
        {#if selected}
          <AssetThumb asset={selected} projectId={session.project.id} />
          <div class="detail-copy">
            <span class="mono-label">{selected.kind}</span>
            <strong>{selected.name}</strong>
            <span>{formatBytes(selected.bytes)}</span>
            {#if selected.width && selected.height}
              <span>{selected.width} × {selected.height}</span>
            {/if}
            <span class="usage">
              {t('media.usageElements', { count: selectedUsage.elements })} ·
              {t('media.usageFichas', { count: selectedUsage.fichas })}
            </span>
          </div>
          {#if selectedUsage.elements || selectedUsage.fichas}
            <p class="hint">{t('media.inUse')}</p>
          {:else if confirmDelete}
            <div class="confirm-actions">
              <Button size="sm" variant="ghost" onclick={() => (confirmDelete = false)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" variant="accent" onclick={remove}>
                {t('media.delete')}
              </Button>
            </div>
          {:else}
            <Button
              size="sm"
              variant="ghost"
              onclick={() => (confirmDelete = true)}
            >
              <Icon name="trash" size={12} />
              {t('media.delete')}
            </Button>
          {/if}
        {:else}
          <p class="hint">{t('media.none')}</p>
        {/if}
      </aside>
    </div>
  </div>
</Dialog>

<style>
  .media-manager {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .media-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .media-toolbar input {
    flex: 1;
    min-width: 180px;
    height: 30px;
    padding: 0 6px;
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--ink);
    font: inherit;
  }
  .filters {
    display: flex;
    gap: 2px;
  }
  .filters button {
    padding: 5px 7px;
    border: 1px solid var(--line-soft);
    background: transparent;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    text-transform: lowercase;
    cursor: pointer;
  }
  .filters button.active {
    border-color: var(--accent);
    color: var(--ink);
  }
  .media-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 230px;
    gap: var(--space-4);
    min-height: 420px;
  }
  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    align-content: start;
    gap: var(--space-2);
    max-height: 540px;
    overflow: auto;
  }
  .media-card {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 4px;
    border: 1px solid var(--line-soft);
    background: transparent;
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    text-align: left;
    cursor: pointer;
  }
  .media-card.active {
    border-color: var(--selection);
    outline: 1px solid var(--selection);
  }
  .media-card :global(.asset-thumb) {
    width: 100%;
    aspect-ratio: 1;
  }
  .media-card small {
    color: var(--muted);
    font-size: var(--text-3xs);
  }
  .media-detail {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-left: var(--space-3);
    border-left: 1px solid var(--line-soft);
    min-width: 0;
  }
  .media-detail :global(.asset-thumb) {
    width: 100%;
    aspect-ratio: 1;
  }
  .detail-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-wrap: anywhere;
    font-size: var(--text-2xs);
  }
  .detail-copy strong {
    font-family: var(--font-wordmark);
    font-size: var(--text-lg);
    font-weight: var(--wordmark-weight);
  }
  .usage {
    color: var(--muted);
  }
  .hint {
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
  .confirm-actions {
    display: flex;
    gap: var(--space-1);
  }
  @media (max-width: 700px) {
    .media-body {
      grid-template-columns: 1fr;
    }
    .media-detail {
      border-left: 0;
      padding-left: 0;
    }
  }
</style>
