<script>
  import { t } from '../../lib/i18n/index.svelte.js';
  import { META_FIELDS, hasMetaContent } from '../../lib/domain/links.js';
  import { fontStack } from '../../lib/domain/elements.js';
  import { normaliseFichaStyle } from '../../lib/domain/ficha-style.js';

  let { element, open = false, project = null } = $props();
  const fichaStyle = $derived(normaliseFichaStyle(project?.fichaStyle));
  const styleVars = $derived(
    `--ficha-bg:${fichaStyle.background};--ficha-ink:${fichaStyle.ink};--ficha-accent:${fichaStyle.accent};--ficha-border:${fichaStyle.borderWidth}px;--ficha-radius:${fichaStyle.radius}px;--ficha-heading:${fontStack(project, fichaStyle.headingFont)};--ficha-body:${fontStack(project, fichaStyle.bodyFont)}`
  );

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

<details class="ficha-card" style={styleVars} {open}>
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
    font-family: var(--ficha-heading, var(--font-serif));
    font-size: var(--text-xs);
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    color: var(--ficha-ink, var(--muted));
    opacity: 0.65;
    font-size: var(--text-2xs);
  }

  details[open] .chevron {
    transform: rotate(45deg);
  }

  .ficha-body {
    padding: 0 var(--space-2) var(--space-2);
    border-top: 1px solid var(--ficha-accent, var(--line-soft));
  }

  dl {
    display: grid;
    grid-template-columns: minmax(70px, auto) 1fr;
    gap: 2px var(--space-2);
    margin: var(--space-2) 0 0;
  }

  dt {
    color: var(--ficha-ink, var(--muted));
    font-family: var(--ficha-body, var(--font-ui));
    font-size: var(--text-3xs);
    opacity: 0.65;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    font-family: var(--ficha-body, var(--font-ui));
    font-size: var(--text-2xs);
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .empty {
    padding-top: var(--space-2);
    color: var(--ficha-ink, var(--muted));
    opacity: 0.65;
    font-size: var(--text-2xs);
  }
</style>
