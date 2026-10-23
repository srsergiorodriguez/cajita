<script>
  let { title, children, actions } = $props();
</script>

<div class="panel">
  <header class="panel-head">
    <h2>{title}</h2>
    {#if actions}{@render actions()}{/if}
  </header>
  <div class="panel-body">
    {#if children}{@render children()}{/if}
  </div>
</div>

<style>
  .panel {
    border: var(--border-control) solid var(--line);
    background: var(--panel-2);
    box-shadow: var(--shadow-card);
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--line-soft);
  }

  h2 {
    font-family: var(--font-wordmark);
    font-size: var(--text-lg);
    font-weight: var(--wordmark-weight);
    letter-spacing: var(--wordmark-tracking);
  }

  .panel-body {
    padding: var(--space-4);
  }
</style>
