<script>
  let { options = [], value = '', onchange = null } = $props();
</script>

<div class="filter-tabs" role="tablist">
  {#each options as option (option.value)}
    <button
      type="button"
      role="tab"
      class:active={value === option.value}
      aria-selected={value === option.value}
      onclick={() => onchange?.(option.value)}
    >
      {option.label}
      {#if option.count !== undefined}<span>{option.count}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .filter-tabs {
    display: flex;
    gap: 2px;
    min-width: 0;
    overflow-x: auto;
    border-bottom: 1px solid var(--line);
    scrollbar-width: thin;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    flex: 0 0 auto;
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    text-transform: lowercase;
    cursor: pointer;
  }
  button.active {
    border-bottom-color: var(--accent);
    color: var(--ink);
  }
  span {
    display: inline-grid;
    min-width: 17px;
    height: 16px;
    place-items: center;
    padding: 0 3px;
    border: 1px solid var(--line-soft);
    background: var(--panel-3);
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 9px;
    line-height: 1;
  }
</style>
