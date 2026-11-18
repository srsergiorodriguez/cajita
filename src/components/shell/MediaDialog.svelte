<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import FilterTabs from '../ui/FilterTabs.svelte';
  import AssetThumb from './AssetThumb.svelte';
  import { addElement, deleteAsset, session } from '../../lib/state/project.svelte.js';
  import { formatBytes } from '../../lib/domain/model.js';
  import { assetUsageMap } from '../../lib/domain/media-usage.js';
  import { mediaAssets } from '../../lib/domain/media-assets.js';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { open = $bindable(false) } = $props();
  let filter = $state('all');
  let search = $state('');
  let selectedId = $state(null);
  let confirmDelete = $state(false);
  let checkedIds = $state([]);

  const allAssets = $derived(mediaAssets(session.project));

  const drawings = $derived(Object.values(session.project?.drawings ?? {}));
  const fichaAssets = $derived(
    new Set(
      Object.values(session.project?.fichas ?? {})
        .map((ficha) => ficha.assetId)
        .filter(Boolean)
    )
  );

  const usageByAsset = $derived(assetUsageMap(session.project));

  const filtered = $derived(
    allAssets.filter((asset) => {
      if (filter === 'images' && asset.kind !== 'image') return false;
      if (filter === 'video' && asset.kind !== 'video') return false;
      if (filter === 'audio' && asset.kind !== 'audio') return false;
      if (filter === 'fichas' && !fichaAssets.has(asset.id)) return false;
      if (filter === 'unused') {
        const used = usageFor(asset.id);
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
          elements: usageByAsset.get(selected.id)?.elements ?? 0,
          fichas: usageByAsset.get(selected.id)?.fichas ?? 0,
          total: usageFor(selected.id),
          references: usageByAsset.get(selected.id)?.references ?? []
        }
      : { elements: 0, fichas: 0 }
  );

  const selectedDrawing = $derived(
    drawings.find((drawing) => drawing.assetId === selected?.id) ?? null
  );

  function usageFor(assetId) {
    const usage = usageByAsset.get(assetId);
    return usage
      ? usage.elements + usage.compositions + usage.fichas + usage.drawings + usage.fonts
      : 0;
  }

  const selectedHasUsage = $derived(checkedIds.some((id) => usageFor(id) > 0));

  function toggleChecked(assetId) {
    checkedIds = checkedIds.includes(assetId)
      ? checkedIds.filter((id) => id !== assetId)
      : [...checkedIds, assetId];
  }

  function selectUnused() {
    checkedIds = filtered.filter((asset) => usageFor(asset.id) === 0).map((asset) => asset.id);
  }

  async function removeChecked() {
    if (!checkedIds.length || selectedHasUsage) return;
    const removed = [];
    for (const id of checkedIds) {
      const asset = allAssets.find((item) => item.id === id);
      try {
        await deleteAsset(id);
        removed.push(id);
        if (selectedId === id) selectedId = null;
      } catch (error) {
        toast(error instanceof Error ? error.message : String(error), 'error');
      }
    }
    checkedIds = [];
    if (removed.length) toast(t('media.batchDeleted', { count: removed.length }), 'success');
  }

  function addSelectedToPage() {
    if (!selected) return;
    try {
      if (selectedDrawing) {
        addElement('drawing', {
          assetId: selected.id,
          drawingId: selectedDrawing.id,
          alt: selected.name,
          animated: true
        });
      } else {
        addElement(selected.kind, { assetId: selected.id });
      }
      toast(t('media.addedToPage', { name: selected.name }), 'success');
      open = false;
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

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
    if (!selected || selectedUsage.total > 0) return;
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
      <FilterTabs options={filters} value={filter} onchange={(value) => (filter = value)} />
      <Button size="sm" variant="ghost" onclick={selectUnused}>{t('media.selectUnused')}</Button>
    </div>

    {#if checkedIds.length}
      <div class="batch-bar">
        <span>{t('media.selectedCount', { count: checkedIds.length })}</span>
        {#if selectedHasUsage}<span class="hint">{t('media.batchInUse')}</span>{/if}
        <Button size="sm" variant="ghost" onclick={() => (checkedIds = [])}>{t('common.cancel')}</Button>
        <Button size="sm" variant="accent" disabled={selectedHasUsage} onclick={removeChecked}><Icon name="trash" size={12} />{t('media.delete')}</Button>
      </div>
    {/if}

    <div class="media-body">
      <div class="media-grid">
        {#each filtered as asset (asset.id)}
          <div class="media-card-wrap">
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
            <label class="batch-check">
              <input
                type="checkbox"
                checked={checkedIds.includes(asset.id)}
                aria-label={t('media.select')}
                onchange={() => toggleChecked(asset.id)}
              />
            </label>
          </div>
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
              {t('media.usageTotal', { count: selectedUsage.total })}
            </span>
          </div>
          <Button size="sm" variant="secondary" onclick={addSelectedToPage}><Icon name="plus" size={12} />{t('media.addToPage')}</Button>
          {#if selectedUsage.total > 0}
            <p class="hint">{t('media.inUse')}</p>
            <ul class="usage-list">
              {#each selectedUsage.references as reference (reference.kind + reference.label)}
                <li><span>{reference.label}</span><small>{t(`media.usageKind.${reference.kind}`)}</small></li>
              {/each}
            </ul>
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
  .media-card-wrap { position: relative; display: flex; min-width: 0; }
  .media-card {
    display: flex;
    width: 100%;
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
  .batch-check { position: absolute; top: 5px; left: 5px; display: grid; place-items: center; width: 20px; height: 20px; border: 1px solid var(--line); background: var(--panel-2); }
  .batch-check input { width: 13px; height: 13px; margin: 0; accent-color: var(--selection); }
  .batch-bar { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; padding: var(--space-2); border: 1px solid var(--line); background: var(--active-wash); }
  .batch-bar .hint { flex: 1 0 100%; }
  .media-card :global(.asset-thumb) {
    width: 100%;
    aspect-ratio: 1;
  }
  .media-card span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  .usage-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-2xs);
  }
  .usage-list li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    min-width: 0;
    padding: 2px 0;
    border-bottom: 1px solid var(--line-soft);
  }
  .usage-list span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .usage-list small {
    flex: 0 0 auto;
    color: var(--muted);
    font-size: var(--text-3xs);
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
