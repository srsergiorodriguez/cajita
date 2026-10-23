<script>
  import { t } from '../../lib/i18n/index.svelte.js';
  import { META_FIELDS, hasMetaContent } from '../../lib/domain/links.js';

  let { element, open = false } = $props();

  const labels = {
    title: 'meta.titleField',
    creator: 'meta.creator',
    date: 'meta.date',
    medium: 'meta.medium',
    rights: 'meta.rights',
    source: 'meta.source',
    description: 'meta.description'
  };

  const fields = $derived(META_FIELDS.filter((field) => element.meta?.[field]?.trim()));
  const title = $derived(
    element.meta?.title?.trim() || element.name?.trim() || t('meta.title')
  );
</script>

<details class="ficha-card" {open}>
  <summary>
    <span class="mono-label">{t('meta.summary')}</span>
    <strong>{title}</strong>
    <span class="chevron" aria-hidden="true">＋</span>
  </summary>
  <div class="ficha-body">
    {#if fields.length === 0}
      <p class="empty">{t('meta.empty')}</p>
    {:else}
      <dl>
        {#each fields as field}
          <dt>{t(labels[field])}</dt>
          <dd>{element.meta[field]}</dd>
        {/each}
      </dl>
    {/if}
  </div>
</details>

<style>
  .ficha-card {
    border: var(--border-control) solid var(--line);
    background: var(--panel-2);
  }

  summary {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    padding: var(--space-2);
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary strong {
    flex: 1;
    overflow: hidden;
    font-family: var(--font-serif);
    font-size: var(--text-xs);
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  details[open] .chevron {
    transform: rotate(45deg);
  }

  .ficha-body {
    padding: 0 var(--space-2) var(--space-2);
    border-top: 1px solid var(--line-soft);
  }

  dl {
    display: grid;
    grid-template-columns: minmax(70px, auto) 1fr;
    gap: 2px var(--space-2);
    margin: var(--space-2) 0 0;
  }

  dt {
    color: var(--muted);
    font-size: var(--text-3xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    font-size: var(--text-2xs);
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .empty {
    padding-top: var(--space-2);
    color: var(--muted);
    font-size: var(--text-2xs);
  }
</style>
