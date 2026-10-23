<script>
  import Button from '../ui/Button.svelte';
  import IconButton from '../ui/IconButton.svelte';
  import Section from '../ui/Section.svelte';
  import ElementInspector from '../inspector/ElementInspector.svelte';
  import PageInspector from '../inspector/PageInspector.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { formatBytes } from '../../lib/domain/model.js';
  import {
    activePage,
    deleteAsset,
    selectedElement,
    session
  } from '../../lib/state/project.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import { preferences, toggleCollapsed } from '../../lib/state/preferences.svelte.js';

  const page = $derived(activePage());
  const element = $derived(selectedElement());
  const project = $derived(session.project);
  const asset = $derived(
    session.selectedAssetId ? (project?.assets?.[session.selectedAssetId] ?? null) : null
  );
  let confirming = $state(false);

  $effect(() => {
    session.selectedAssetId;
    confirming = false;
  });

  function assetUses(assetId) {
    let count = 0;
    for (const item of project?.pages ?? []) {
      for (const child of item.elements ?? []) {
        if (child.assetId === assetId) count += 1;
      }
    }
    return count;
  }

  function assetKindLabel(kind) {
    if (kind === 'image') return t('image.title');
    if (kind === 'video') return t('video.title');
    if (kind === 'audio') return t('audio.title');
    if (kind === 'font') return t('fonts.title');
    return kind;
  }

  function elementTypeLabel(node) {
    if (!node) return '';
    if (node.type === 'shape') return t('shape.title');
    if (node.type === 'ficha') return t('ficha.title');
    if (node.type === 'embed') {
      if (node.provider === 'observable') return t('embed.observable');
      if (node.provider === 'p5') return t('embed.p5');
      return t('embed.youtube');
    }
    if (node.type === 'text') return t('text.title');
    if (node.type === 'image') return t('image.title');
    if (node.type === 'video') return t('video.title');
    if (node.type === 'audio') return t('audio.title');
    return node.type;
  }

  function duration(seconds) {
    if (!seconds) return '—';
    const total = Math.round(seconds);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function dateLabel(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat(preferences.locale, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  async function removeAsset() {
    if (!asset) return;
    try {
      await deleteAsset(asset.id);
      toast(t('inspector.deleteAsset'), 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      confirming = false;
    }
  }
</script>

<aside
  class="inspector"
  aria-label={asset
    ? t('inspector.media')
    : element
      ? t('element.title')
      : t('inspector.page')}
>
  <div class="inspector-head">
    <strong
      >{asset
        ? t('inspector.media')
        : element
          ? t('element.title')
          : t('inspector.page')}</strong
    >
    <span class="inspector-head-actions">
      <span class="stamp"
        >{asset
          ? assetKindLabel(asset.kind)
          : element
            ? elementTypeLabel(element)
            : t('inspector.page')}</span
      >
      <IconButton
        label={t('top.collapseInspector')}
        icon="chevron-right"
        size={24}
        iconSize={12}
        variant="ghost"
        onclick={() => toggleCollapsed('inspector')}
      />
    </span>
  </div>

  <div class="inspector-scroll">
    {#if asset}
      <Section label={asset.name}>
        <dl class="asset-info">
          <div><dt>{t('inspector.kind')}</dt><dd>{assetKindLabel(asset.kind)}</dd></div>
          <div><dt>{t('inspector.size')}</dt><dd>{formatBytes(asset.bytes)}</dd></div>
          <div
            ><dt>{t('inspector.dimensions')}</dt><dd
              >{asset.width && asset.height ? `${asset.width} × ${asset.height}` : '—'}</dd
            ></div
          >
          <div
            ><dt>{t('inspector.duration')}</dt><dd>{duration(asset.duration)}</dd></div
          >
          <div><dt>{t('inspector.created')}</dt><dd>{dateLabel(asset.createdAt)}</dd></div>
          <div><dt>{t('inspector.mime')}</dt><dd>{asset.mime}</dd></div>
        </dl>
        <p class="usage">{t('inspector.used', { count: assetUses(asset.id) })}</p>

        {#if confirming}
          <p class="confirm-hint">{t('inspector.deleteAssetHint')}</p>
          <div class="confirm-actions">
            <Button size="sm" variant="ghost" onclick={() => (confirming = false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="danger" onclick={removeAsset}>
              {t('common.delete')}
            </Button>
          </div>
        {:else}
          <Button size="sm" variant="danger" onclick={() => (confirming = true)}>
            {t('inspector.deleteAsset')}
          </Button>
        {/if}
      </Section>
    {:else if element}
      {#key element.id}
        <ElementInspector {element} />
      {/key}
    {:else if page}
      <PageInspector {page} />
    {/if}
  </div>
</aside>

<style>
  .inspector {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--panel);
    border-left: var(--border-control) solid var(--line);
  }

  .inspector-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--line-soft);
  }

  .inspector-head strong {
    font-size: var(--text-xs);
    font-weight: 700;
  }

  .inspector-head-actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .inspector-scroll {
    min-height: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--line-soft) transparent;
  }

  .asset-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    margin: 0;
  }

  .asset-info div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .asset-info dt {
    color: var(--muted);
    font-size: var(--label-param-size);
    letter-spacing: var(--label-param-tracking);
  }

  .asset-info dd {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--ink);
    font-size: var(--text-xs);
  }

  .usage {
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .confirm-hint {
    color: var(--danger);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }

  .confirm-actions {
    display: flex;
    gap: var(--space-2);
  }
</style>
