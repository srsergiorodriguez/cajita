<script>
  import AssetThumb from '../shell/AssetThumb.svelte';
  import { fontStack } from '../../lib/domain/elements.js';
  import { t } from '../../lib/i18n/index.svelte.js';
  import {
    fichaCollectionFields,
    fichaCollectionRecords,
    normaliseFichaCollection
  } from '../../lib/domain/ficha-collection.js';
  import { fichaCardRows } from '../../lib/domain/fichas.js';

  let { project, element } = $props();
  const config = $derived(normaliseFichaCollection(element.collection));
  const fields = $derived(fichaCollectionFields(project, config));
  const records = $derived(fichaCollectionRecords(project, config));
  const style = $derived(project?.fichaStyle ?? {});
  const vars = $derived(
    `--ficha-bg:${style.background};--ficha-ink:${style.ink};--ficha-accent:${style.accent};--ficha-border:${style.borderWidth}px;--ficha-radius:${style.radius}px;--ficha-heading:${fontStack(project, style.headingFont)};--ficha-body:${fontStack(project, style.bodyFont)};--ficha-columns:${config.columns}`
  );
  function assetFor(record) {
    return project?.assets?.[record.assetId] ?? null;
  }
  function rows(record) {
    return fichaCardRows(project, record).slice(0, 4);
  }
</script>

<div class="ficha-collection-preview" style={vars}>
  {#if config.search || fields.length}
    <div class="collection-toolbar">
      {#if config.search}<span class="search-preview">{t('ficha.collectionSearchPlaceholder')}</span>{/if}
      {#each fields as field (field.id)}
        <span class="filter-preview">{field.label} <i>{t('ficha.collectionAll')}</i></span>
      {/each}
      <span class="count-preview">{t('ficha.collectionCount', { count: records.length })}</span>
    </div>
  {/if}
  {#if records.length}
    <div class="collection-grid">
      {#each records as record (record.id)}
        <article class="collection-card">
          {#if assetFor(record)}
            <div class="collection-image"><AssetThumb asset={assetFor(record)} projectId={project.id} /></div>
          {:else}
            <div class="collection-image collection-image--empty">ficha</div>
          {/if}
          <div class="collection-copy">
            {#if config.showCode}<span class="collection-code">{record.code}</span>{/if}
            <strong>{record.label}</strong>
            {#if rows(record).length}
              <dl>
                {#each rows(record) as row (row.field.id)}
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                {/each}
              </dl>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <p class="collection-empty">{config.emptyText || t('ficha.collectionEmptyDefault')}</p>
  {/if}
</div>

<style>
  .ficha-collection-preview {
    display: flex;
    flex-direction: column;
    gap: 1.2cqw;
    width: 100%;
    height: 100%;
    overflow: hidden;
    color: var(--ficha-ink);
    pointer-events: none;
  }
  .collection-toolbar {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    gap: 1cqw;
    padding-bottom: 0.8cqw;
    border-bottom: 1px solid color-mix(in srgb, var(--ficha-accent) 35%, transparent);
  }
  .search-preview {
    flex: 1 1 14cqw;
    min-width: 12cqw;
    padding: 0.6cqw 0.8cqw;
    border: 1px solid var(--ficha-accent);
    background: var(--ficha-bg);
    color: var(--ficha-ink);
    font: 1.25cqw 'Space Mono', monospace;
    opacity: 0.7;
  }
  .filter-preview {
    display: flex;
    flex-direction: column;
    gap: 0.3cqw;
    font: 1.05cqw 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .filter-preview i {
    padding: 0.45cqw 0.6cqw;
    border: 1px solid var(--ficha-accent);
    background: var(--ficha-bg);
    color: var(--ficha-ink);
    font: 1.15cqw 'Space Mono', monospace;
    font-style: normal;
    text-transform: none;
  }
  .count-preview {
    margin-left: auto;
    font: 1.1cqw 'Space Mono', monospace;
    opacity: 0.7;
  }
  .collection-grid {
    display: grid;
    grid-template-columns: repeat(var(--ficha-columns, 3), minmax(0, 1fr));
    gap: 1.2cqw;
    align-content: start;
    overflow: auto;
    min-height: 0;
  }
  .collection-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: var(--ficha-border) solid var(--ficha-accent);
    border-radius: var(--ficha-radius);
    background: var(--ficha-bg);
    color: var(--ficha-ink);
  }
  .collection-image {
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    background: color-mix(in srgb, var(--ficha-bg) 70%, var(--ficha-ink));
  }
  .collection-image :global(.asset-thumb) {
    width: 100%;
    height: 100%;
    border: 0;
  }
  .collection-image--empty {
    display: grid;
    place-items: center;
    font: 1.2cqw 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.5;
  }
  .collection-copy {
    display: flex;
    flex-direction: column;
    gap: 0.45cqw;
    padding: 1cqw;
  }
  .collection-code {
    font: 1cqw 'Space Mono', monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.65;
  }
  .collection-copy strong {
    font-family: var(--ficha-heading);
    font-size: 1.7cqw;
    line-height: 1.05;
    font-weight: 700;
  }
  .collection-copy dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.2cqw 0.7cqw;
    margin: 0.4cqw 0 0;
  }
  .collection-copy dt {
    font: 1cqw 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.6;
  }
  .collection-copy dd {
    margin: 0;
    font: 1.1cqw 'Space Mono', monospace;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
  .collection-empty {
    margin: auto;
    padding: 2cqw;
    font: 1.4cqw 'Space Mono', monospace;
    text-align: center;
    opacity: 0.65;
  }
</style>
