<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { session } from '../../lib/state/project.svelte.js';
  import { buildPreview } from '../../lib/export/preview.js';
  import { buildPrintDocument } from '../../lib/export/print.js';

  let { open = $bindable(false) } = $props();
  let iframe = $state(null);
  let html = $state('');
  let building = $state(false);
  let error = $state('');

  $effect(() => {
    if (!open || !session.project?.print) return;
    let cancelled = false;
    building = true;
    error = '';
    html = '';
    buildPreview(session.project, { print: true })
      .then((preview) => {
        if (cancelled) return;
        html = buildPrintDocument(session.project, preview.pages);
      })
      .catch((err) => {
        if (!cancelled) error = err instanceof Error ? err.message : String(err);
      })
      .finally(() => {
        if (!cancelled) building = false;
      });
    return () => {
      cancelled = true;
    };
  });

  function print() {
    iframe?.contentWindow?.print();
  }
</script>

<Dialog bind:open title={t('print.title')} wide>
  {#if error}
    <p class="error">{error}</p>
  {:else if building}
    <p class="status">{t('print.building')}</p>
  {:else if html}
    <p class="hint">{t('print.hint')}</p>
    <iframe
      bind:this={iframe}
      class="print-preview"
      title={t('print.title')}
      sandbox="allow-same-origin allow-modals"
      srcdoc={html}
    ></iframe>
    <div class="actions">
      <Button variant="ghost" onclick={() => (open = false)}>{t('common.cancel')}</Button>
      <Button variant="accent" onclick={print}>{t('print.print')}</Button>
    </div>
  {/if}
</Dialog>

<style>
  .status,
  .hint {
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
  .error {
    color: var(--danger);
    font-size: var(--text-xs);
  }
  .print-preview {
    display: block;
    width: 100%;
    height: min(66vh, 680px);
    border: 1px solid var(--line);
    background: var(--panel-2);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-2);
  }
</style>
