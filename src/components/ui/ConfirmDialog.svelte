<script>
  import Button from './Button.svelte';
  import Dialog from './Dialog.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';

  let {
    open = $bindable(false),
    title = '',
    message = '',
    confirmLabel,
    danger = true,
    onconfirm
  } = $props();

  let busy = $state(false);

  async function confirm() {
    if (busy) return;
    busy = true;
    try {
      await onconfirm?.();
      open = false;
    } finally {
      busy = false;
    }
  }
</script>

<Dialog bind:open {title}>
  <p class="message">{message}</p>
  <div class="actions">
    <Button variant="ghost" onclick={() => (open = false)} disabled={busy}>
      {t('common.cancel')}
    </Button>
    <Button variant={danger ? 'danger' : 'primary'} onclick={confirm} disabled={busy}>
      {confirmLabel ?? t('common.delete')}
    </Button>
  </div>
</Dialog>

<style>
  .message {
    color: var(--ink-2);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line-soft);
  }
</style>
