<script>
  import Button from '../ui/Button.svelte';
  import Dialog from '../ui/Dialog.svelte';
  import { plural, t } from '../../lib/i18n/index.svelte.js';
  import { formatBytes, projectStats } from '../../lib/domain/model.js';
  import { session } from '../../lib/state/project.svelte.js';

  let { open = $bindable(false), ondownload, oncloseproject, ondelete } = $props();

  let confirming = $state(false);
  let busy = $state(false);
  const summary = $derived(session.project ? projectStats(session.project) : null);

  async function run(action) {
    if (busy) return;
    busy = true;
    try {
      await action?.();
      open = false;
      confirming = false;
    } finally {
      busy = false;
    }
  }
</script>

<Dialog bind:open title={t('projectMenu.title')}>
  {#if session.project && summary}
    <div class="project-summary">
      <h2>{session.project.title}</h2>
      <p>
        {plural(summary.pages, 'units.pageOne', 'units.pageMany')} ·
        {plural(summary.media, 'units.assetOne', 'units.assetMany')} ·
        {formatBytes(summary.bytes)}
      </p>
      <p class="slug">/{session.project.slug}</p>
    </div>

    <div class="menu-actions">
      <Button variant="secondary" onclick={() => run(ondownload)} disabled={busy}>
        {t('projectMenu.download')}
      </Button>
      <Button variant="ghost" onclick={() => run(oncloseproject)} disabled={busy}>
        {t('projectMenu.close')}
      </Button>
    </div>

    <div class="danger-zone">
      {#if confirming}
        <p>{t('projectMenu.deleteHint')}</p>
        <div class="danger-actions">
          <Button
            size="sm"
            variant="ghost"
            onclick={() => (confirming = false)}
            disabled={busy}
          >
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onclick={() => run(ondelete)}
            disabled={busy || session.lockConflict}
          >
            {t('projectMenu.confirmDelete')}
          </Button>
        </div>
      {:else}
        <Button
          size="sm"
          variant="danger"
          onclick={() => (confirming = true)}
          disabled={busy || session.lockConflict}
        >
          {t('projectMenu.delete')}
        </Button>
      {/if}
    </div>
  {/if}
</Dialog>

<style>
  .project-summary h2 {
    margin-bottom: var(--space-1);
    font-family: var(--font-wordmark);
    font-size: var(--text-xl);
    font-weight: var(--wordmark-weight);
    letter-spacing: -0.02em;
  }

  .project-summary p {
    color: var(--muted);
    font-size: var(--text-xs);
  }

  .project-summary .slug {
    margin-top: var(--space-1);
    color: var(--ink-2);
  }

  .menu-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    padding-top: var(--space-3);
    border-top: 1px solid var(--line-soft);
  }

  .danger-zone {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line-soft);
  }

  .danger-zone p {
    color: var(--danger);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }

  .danger-actions {
    display: flex;
    gap: var(--space-2);
  }
</style>
