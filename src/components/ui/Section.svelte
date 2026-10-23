<script>
  let { label, actions, children, collapsible = false, summary = '' } = $props();
  let open = $state(false);
</script>

{#if collapsible}
  <details class="section section--fold" bind:open>
    <summary class="section-head">
      <span class="label">{label}</span>
      {#if summary}<span class="summary">{summary}</span>{/if}
      {#if actions}{@render actions()}{/if}
      <span class="chevron" aria-hidden="true">＋</span>
    </summary>
    <div class="body">
      {#if children}{@render children()}{/if}
    </div>
  </details>
{:else}
  <section class="section">
    <header class="section-head">
      <span class="label">{label}</span>
      {#if actions}{@render actions()}{/if}
    </header>
    <div class="body">
      {#if children}{@render children()}{/if}
    </div>
  </section>
{/if}

<style>
  .section {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--line-soft);
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  .section--fold > summary {
    flex-wrap: wrap;
    margin-bottom: 0;
    cursor: pointer;
  }

  .section--fold[open] > summary {
    margin-bottom: var(--space-2);
  }

  .label {
    color: var(--ink-2);
    font-family: var(--font-ui);
    font-size: var(--label-category-size);
    font-weight: 700;
    letter-spacing: var(--label-category-tracking);
    text-transform: uppercase;
  }

  .summary {
    flex: 0 0 100%;
    order: 3;
    margin-left: 0;
    padding-top: 1px;
    overflow: hidden;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    flex: 0 0 auto;
    margin-left: auto;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    line-height: 1;
    transition: transform var(--motion-fast) var(--ease-out);
  }

  .section--fold[open] .chevron {
    transform: rotate(45deg);
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
</style>
