<script>
  let { lead = null, timeline = null, actions = null } = $props();
</script>

<div class="studio-toolbar">
  {#if lead}
    <div class="toolbar-lead">{@render lead()}</div>
  {/if}
  {#if timeline}
    <div class="toolbar-timeline">{@render timeline()}</div>
  {/if}
  {#if actions}
    <div class="toolbar-actions">{@render actions()}</div>
  {/if}
</div>

<style>
  .studio-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .toolbar-lead { flex: 0 0 auto; }
  .toolbar-timeline { flex: 1 1 240px; min-width: 0; }
  .toolbar-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1); min-width: 0; }
</style>
