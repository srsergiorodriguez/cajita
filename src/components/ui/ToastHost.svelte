<script>
  import Toast from './Toast.svelte';
  import { ui, dismissToast } from '../../lib/state/ui.svelte.js';
</script>

<div class="toasts" aria-live="polite" aria-atomic="false">
  {#each ui.toasts as item (item.id)}
    <Toast
      message={item.message}
      type={item.type}
      ondismiss={() => dismissToast(item.id)}
    />
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: var(--space-4);
    bottom: calc(var(--strip-h) + var(--space-4));
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    pointer-events: none;
  }

  .toasts :global(.toast) {
    pointer-events: auto;
  }

  @media (max-width: 720px) {
    .toasts {
      bottom: var(--space-4);
    }
  }
</style>
