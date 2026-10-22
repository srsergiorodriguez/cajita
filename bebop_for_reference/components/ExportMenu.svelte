<script>
  import { appState, appActions } from '../state/store.svelte.js';

  const busy = $derived(appState.playbackState === "recording");

  function handleExport(format) {
    if (busy) return;
    appActions.startExport(format);
  }
</script>

{#if appState.hasGenerated}
  <div class="export-menu no-select" role="group" aria-label="export">
    <span class="label">export</span>
    <div class="button-grid">
      <button onclick={() => handleExport('wav')} disabled={busy}>wav</button>
      <button onclick={() => handleExport('midi')} disabled={busy}>midi</button>
      <button onclick={() => handleExport('pico8')} disabled={busy}>pico-8</button>
      <button onclick={() => handleExport('picotron')} disabled={busy}>picotron</button>
    </div>
  </div>
{/if}

<style>
  .export-menu {
    display: grid;
    grid-gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .label {
    font-size: var(--text-md);
    padding-left: 2px;
    text-align: center;
  }

  .button-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: var(--space-1);
  }

</style>