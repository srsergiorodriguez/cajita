<script>
  import IconButton from './IconButton.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';

  let { open = $bindable(false), title = '', wide = false, children } = $props();
  let dialog;
  let pressStartedOnBackdrop = false;

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function handleClose() {
    open = false;
  }

  function onBackdropPointerDown(event) {
    pressStartedOnBackdrop = event.target === dialog;
  }

  function handleBackdrop(event) {
    if (event.target === dialog && pressStartedOnBackdrop) open = false;
    pressStartedOnBackdrop = false;
  }
</script>

<dialog
  bind:this={dialog}
  onclose={handleClose}
  onpointerdown={onBackdropPointerDown}
  onclick={handleBackdrop}
  class:wide
  aria-label={title}
>
  <div class="box">
    <header class="head">
      <h2>{title}</h2>
      <IconButton
        label={t('common.close')}
        icon="close"
        variant="bare"
        onclick={() => (open = false)}
      />
    </header>
    <div class="body">
      {#if children}{@render children()}{/if}
    </div>
  </div>
</dialog>

<style>
  dialog {
    width: min(560px, calc(100vw - 32px));
    max-height: min(720px, calc(100vh - 48px));
    padding: 0;
    border: var(--border-strong) solid var(--line);
    border-radius: 0;
    background: var(--panel-2);
    color: var(--ink);
    box-shadow: var(--shadow-stage);
  }

  dialog.wide {
    width: min(1200px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
  }

  dialog::backdrop {
    background: var(--overlay);
  }

  .box {
    display: flex;
    flex-direction: column;
    max-height: inherit;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4);
    border-bottom: 1px solid var(--line-soft);
    background: var(--panel);
  }

  h2 {
    font-family: var(--font-wordmark);
    font-size: var(--text-xl);
    font-weight: var(--wordmark-weight);
    letter-spacing: var(--wordmark-tracking);
  }

  .body {
    overflow: auto;
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }
</style>
