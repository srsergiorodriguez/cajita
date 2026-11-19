<script>
  import Button from '../ui/Button.svelte';
  import Dialog from '../ui/Dialog.svelte';
  import Section from '../ui/Section.svelte';
  import FontsDialog from '../inspector/FontsDialog.svelte';
  import GridsDialog from '../canvas/GridsDialog.svelte';
  import DesignSystemDialog from '../inspector/DesignSystemDialog.svelte';
  import PrintDialog from '../export/PrintDialog.svelte';
  import PrintSettingsDialog from '../export/PrintSettingsDialog.svelte';
  import { plural, t } from '../../lib/i18n/index.svelte.js';
  import { formatBytes, projectStats } from '../../lib/domain/model.js';
  import {
    session,
    setGridSettings,
    setSiteBackground
  } from '../../lib/state/project.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { open = $bindable(false), ondownload, oncloseproject, ondelete } = $props();

  let confirming = $state(false);
  let busy = $state(false);
  let fontsOpen = $state(false);
  let gridsOpen = $state(false);
  let designOpen = $state(false);
  let printOpen = $state(false);
  let printSettingsOpen = $state(false);
  const summary = $derived(session.project ? projectStats(session.project) : null);

  function apply(action) {
    try {
      action();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

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

    <Section label={t('projectMenu.appearance')}>
      <p class="hint">{t('palette.hint')}</p>
      <Button size="sm" variant="secondary" onclick={() => { designOpen = true; open = false; }}>
        {t('design.open')}
      </Button>
    </Section>

    <Section label={t('fonts.title')}>
      <div class="font-summary">
        <span>
          {plural(
            Object.keys(session.project?.fonts ?? {}).length,
            'units.fontOne',
            'units.fontMany'
          )}
        </span>
        <Button size="sm" variant="ghost" onclick={() => { fontsOpen = true; open = false; }}>
          {t('fonts.manage')}
        </Button>
      </div>
    </Section>

    {#if session.project?.print}
      <Section label={t('print.section')}>
        <p class="hint">{t('print.paperHint', {
          paper: session.project.print.paper.preset,
          width: session.project.print.paper.width,
          height: session.project.print.paper.height
        })}</p>
        <div class="print-actions">
          <Button size="sm" variant="secondary" onclick={() => { printOpen = true; open = false; }}>
            {t('print.open')}
          </Button>
          <Button size="sm" variant="ghost" onclick={() => { printSettingsOpen = true; open = false; }}>
            {t('print.settingsOpen')}
          </Button>
        </div>
      </Section>
    {/if}

    <Section label={t('grid.manager')}>
      <p class="hint">{t('grid.projectHint')}</p>
      <div class="grid-flags">
        <label class="check">
          <input
            type="checkbox"
            checked={session.project?.gridSettings?.show !== false}
            onchange={(event) => apply(() => setGridSettings({ show: event.currentTarget.checked }))}
          />
          <span>{t('grid.show')}</span>
        </label>
        <label class="check">
          <input
            type="checkbox"
            checked={session.project?.gridSettings?.snap !== false}
            onchange={(event) => apply(() => setGridSettings({ snap: event.currentTarget.checked }))}
          />
          <span>{t('grid.snap')}</span>
        </label>
      </div>
      <Button size="sm" variant="secondary" onclick={() => { gridsOpen = true; open = false; }}>
        {t('grid.manage')}
      </Button>
    </Section>

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
<FontsDialog bind:open={fontsOpen} />
<GridsDialog bind:open={gridsOpen} />
<DesignSystemDialog bind:open={designOpen} />
<PrintDialog bind:open={printOpen} />
<PrintSettingsDialog bind:open={printSettingsOpen} />

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
  .grid-flags {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--ink);
    font-size: var(--text-xs);
  }
  .check input {
    accent-color: var(--selection);
  }
  .font-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--muted);
    font-size: var(--text-2xs);
  }
  .print-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
  .hint {
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
</style>
