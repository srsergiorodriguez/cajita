<script>
  import AssetThumb from './AssetThumb.svelte';
  import MediaDialog from './MediaDialog.svelte';
  import AddTile from '../ui/AddTile.svelte';

  let { compact = false } = $props();
  import Button from '../ui/Button.svelte';
  import { platform } from '../../lib/platform/index.js';
  import { importMedia, selectAsset, session } from '../../lib/state/project.svelte.js';
  import { formatBytes } from '../../lib/domain/model.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import { plural, t } from '../../lib/i18n/index.svelte.js';

  const assets = $derived.by(() => {
    const seen = new Set();
    return Object.values(session.project?.assets ?? {}).filter((asset) => {
      if (asset.kind === 'font') return false;
      const key = asset.hash || asset.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  const usage = $derived({
    bytes: assets.reduce((sum, asset) => sum + (Number(asset.bytes) || 0), 0),
    video: assets.filter((asset) => asset.kind === 'video').length
  });
  const importing = $derived(session.busy === 'media');
  let mediaOpen = $state(false);

  async function chooseFiles() {
    if (!session.project || importing || session.lockConflict) return;
    const files = await platform.files.pickFiles({
      accept:
        'image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,audio/mpeg,audio/ogg,audio/wav,audio/mp4',
      multiple: true
    });
    if (!files.length) return;
    try {
      const result = await importMedia(files);
      if (result.added) {
        toast(t('media.added', { count: result.added }), 'success');
      }
      for (const error of result.errors) toast(error, 'error');
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }
</script>

<section class="media-panel" class:compact aria-label={t('left.media')}>
  <div class="media-head">
    {#if !compact}<span class="mono-label">{t('left.media')}</span>{/if}
    <span class="media-head-actions">
      <Button size="sm" variant="ghost" onclick={() => (mediaOpen = true)}>
        {t('media.manage')}
      </Button>
    </span>
  </div>

  <div class="media-grid">
    {#each assets as asset (asset.id)}
      <button
        type="button"
        class="media-tile"
        class:active={session.selectedAssetId === asset.id}
        title={asset.name}
        onclick={() => selectAsset(asset.id)}
      >
        <AssetThumb {asset} projectId={session.project.id} />
        <span class="media-name">{asset.name}</span>
      </button>
    {/each}
    <AddTile
      label={t('media.import')}
      title={t('media.import')}
      onclick={chooseFiles}
      disabled={importing || session.lockConflict}
    />
  </div>
  {#if assets.length === 0}
    <div class="media-empty">
      <strong>{t('left.mediaEmpty')}</strong>
      <span>{t('media.emptyHint')}</span>
    </div>
  {:else}
    <div class="media-usage">
      <span
        >{plural(assets.length, 'units.assetOne', 'units.assetMany')} ·
        {formatBytes(usage.bytes)}</span
      >
      <span>{t('media.videoLimit', { count: usage.video })}</span>
    </div>
  {/if}
  <MediaDialog bind:open={mediaOpen} />
</section>

<style>
  .media-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-height: 0;
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--line-soft);
    overflow: hidden;
  }

  .media-panel.compact {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    border-top: 0;
    gap: 2px;
  }

  .media-panel.compact .media-grid {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .media-panel.compact .media-tile {
    flex-basis: 58px;
    width: 58px;
  }

  .media-panel.compact .media-name {
    font-size: var(--text-3xs);
  }

  .media-panel.compact .media-usage {
    font-size: var(--text-3xs);
  }

  .media-panel.compact .media-head {
    min-height: 22px;
    justify-content: flex-end;
  }

  .media-head-actions {
    display: flex;
    margin-left: auto;
    gap: 2px;
  }

  .media-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }

  .media-grid {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: var(--space-1);
    scrollbar-width: thin;
    scrollbar-color: var(--line-soft) transparent;
  }

  .media-tile {
    display: flex;
    flex: 0 0 82px;
    flex-direction: column;
    gap: 2px;
    width: 82px;
    min-width: 0;
    padding: 0;
    border: 1px solid var(--line-soft);
    border-radius: 0;
    background: transparent;
    text-align: left;
  }

  .media-tile.active {
    outline: 2px solid var(--selection);
    outline-offset: 1px;
  }

  .media-tile :global(.asset-thumb) {
    border: 0;
  }

  .media-name {
    overflow: hidden;
    padding: 0 2px;
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .media-usage {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--muted);
    font-size: var(--text-2xs);
    white-space: nowrap;
  }

  .media-empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    padding: var(--space-3);
    border: 1px dashed var(--line-soft);
    color: var(--muted);
  }

  .media-empty strong {
    color: var(--ink);
    font-size: var(--text-2xs);
    font-weight: 400;
  }

  .media-empty span {
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
</style>
