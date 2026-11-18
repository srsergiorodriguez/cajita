<script>
  import Dialog from '../ui/Dialog.svelte';

  let {
    open = $bindable(false),
    title = '',
    toolbar = null,
    canvas = null,
    timeline = null,
    properties = null,
    footer = null
  } = $props();
</script>

<Dialog bind:open {title} wide>
  <div class="studio-shell">
    <div class="studio-main">
      {#if toolbar}
        <div class="studio-toolbar">{@render toolbar()}</div>
      {/if}
      <div class="studio-canvas">{@render canvas()}</div>
      {#if timeline}
        <div class="studio-timeline">{@render timeline()}</div>
      {/if}
    </div>
    <aside class="studio-properties">{@render properties()}</aside>
  </div>
  {#if footer}
    <div class="studio-footer">{@render footer()}</div>
  {/if}
</Dialog>

<style>
  .studio-shell {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: var(--space-4);
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
  }

  .studio-main {
    flex: 0 1 560px;
    width: 100%;
    max-width: 560px;
    min-width: 0;
  }

  .studio-toolbar {
    margin-bottom: var(--space-2);
  }

  .studio-canvas {
    min-width: 0;
  }

  .studio-timeline {
    margin-top: var(--space-2);
  }

  .studio-properties {
    flex: 0 1 290px;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
    max-width: 290px;
    min-width: 0;
  }

  .studio-footer {
    position: sticky;
    bottom: 0;
    z-index: 2;
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-4);
    padding: var(--space-3) 0 var(--space-1);
    border-top: 1px solid var(--line-soft);
    background: var(--panel-2);
  }

  @media (max-width: 820px) {
    .studio-shell {
      flex-direction: column;
      max-width: 560px;
    }

    .studio-main,
    .studio-properties {
      flex-basis: auto;
      max-width: 100%;
    }
  }
</style>
