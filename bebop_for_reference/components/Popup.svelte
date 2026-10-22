<script>
  import { onMount } from 'svelte';
  import { appState } from '../state/store.svelte.js';

  let { label = 'bebop', returnFocus = null, children } = $props();

  let dialog;
  let lastFocus;

  onMount(() => {
    lastFocus = returnFocus ?? document.activeElement;
    if (typeof dialog?.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog?.setAttribute('open', '');
      dialog?.querySelector('button')?.focus();
    }
    document.addEventListener('click', handleOutsideClick);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
      if (dialog?.open) dialog.close();
      if (lastFocus instanceof HTMLElement) lastFocus.focus();
    };
  });

  function closePopup() {
    appState.popupState = undefined;
  }

  function handleCancel(event) {
    event.preventDefault();
    closePopup();
  }

  function handleClose() {
    if (appState.popupState) appState.popupState = undefined;
  }

  function handleOutsideClick(event) {
    if (!dialog?.open) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) closePopup();
  }
</script>

<dialog
  bind:this={dialog}
  class="popup no-select"
  aria-modal="true"
  aria-label={label}
  oncancel={handleCancel}
  onclose={handleClose}
>
  <div class="xbar">
    <button class="xclose" aria-label="close" onclick={closePopup}>X</button>
  </div>
  <div class="content">
    {@render children?.()}
  </div>
</dialog>

<style>
  .popup {
    width: var(--popup-width);
    max-width: calc(100vw - var(--space-4));
    max-height: calc(100vh - var(--space-4));
    margin: auto;
    padding: 0;
    color: var(--ink);
    background: var(--paper);
    border: solid var(--modal-stroke-width) var(--ink);
    border-radius: 0;
    box-shadow: none;
  }

  .popup::backdrop {
    background: transparent;
  }

  .content {
    padding: var(--space-4);
    font-size: var(--text-sm);
  }

  .xbar {
    display: flex;
    justify-content: flex-end;
  }

  .xclose {
    text-align: right;
    cursor: pointer;
    border: solid var(--stroke-width) transparent;
    background: none;
  }

  .xclose:hover {
    border-left: dotted var(--stroke-width) var(--ink);
    border-bottom: dotted var(--stroke-width) var(--ink);
  }
</style>
