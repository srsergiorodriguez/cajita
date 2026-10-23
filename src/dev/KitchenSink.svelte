<script>
  import Button from '../components/ui/Button.svelte';
  import Dialog from '../components/ui/Dialog.svelte';
  import Field from '../components/ui/Field.svelte';
  import IconButton from '../components/ui/IconButton.svelte';
  import Panel from '../components/ui/Panel.svelte';
  import Section from '../components/ui/Section.svelte';
  import SegmentedControl from '../components/ui/SegmentedControl.svelte';
  import Tooltip from '../components/ui/Tooltip.svelte';
  import { t } from '../lib/i18n/index.svelte.js';
  import { preferences, setMode } from '../lib/state/preferences.svelte.js';
  import { toast } from '../lib/state/ui.svelte.js';

  let value = $state('free');
  let dialogOpen = $state(new URLSearchParams(window.location.search).has('dialog'));
</script>

<main class="kitchen">
  <header class="kitchen-head">
    <div>
      <p class="mono-label">cajita / dev</p>
      <h1>{t('kitchen.title')}</h1>
      <p class="note">{t('kitchen.note')}</p>
    </div>
    <SegmentedControl
      label={t('settings.mode')}
      value={preferences.mode}
      options={[
        { value: 'light', label: t('mode.light') },
        { value: 'dark', label: t('mode.dark') }
      ]}
      onchange={setMode}
    />
  </header>

  <div class="grid">
    <Panel title={t('kitchen.buttons')}>
      <div class="row">
        <Button>secondary</Button>
        <Button variant="primary">primary</Button>
        <Button variant="accent">accent</Button>
        <Button variant="ghost">ghost</Button>
        <Button variant="danger">danger</Button>
        <Button disabled>disabled</Button>
      </div>
      <div class="row">
        <IconButton label="undo" icon="undo" />
        <IconButton label="redo" icon="redo" variant="ghost" />
        <IconButton label="settings" icon="settings" variant="bare" />
        <Tooltip label="tooltip"><Button size="sm">hover me</Button></Tooltip>
      </div>
    </Panel>

    <Panel title={t('kitchen.fields')}>
      <Field label="título" value="una casa sin prisa" />
      <Field label="ancho" value="1280" suffix="px" />
      <Field label="dirección" value="/inicio" readonly />
      <SegmentedControl
        label="layout"
        bind:value
        options={[
          { value: 'free', label: t('inspector.free') },
          { value: 'grid', label: t('inspector.grid') }
        ]}
      />
    </Panel>

    <Panel title={t('kitchen.toast')}>
      <div class="row">
        <Button onclick={() => toast('guardado', 'success')}>success</Button>
        <Button onclick={() => toast('algo salió mal', 'error')}>error</Button>
        <Button onclick={() => toast('cajita', 'info')}>info</Button>
      </div>
    </Panel>

    <Panel title={t('kitchen.dialog')}>
      <Button onclick={() => (dialogOpen = true)}>
        {t('kitchen.openDialog')}
      </Button>
    </Panel>
  </div>
</main>

<Dialog bind:open={dialogOpen} title={t('settings.title')}>
  <Section label="demo">
    <p>Un diálogo nativo, con foco atrapado y escape.</p>
  </Section>
</Dialog>

<style>
  .kitchen {
    min-height: 100vh;
    padding: var(--space-6);
    overflow: auto;
    background: var(--motif-desk);
  }

  .kitchen-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-6);
    max-width: 1100px;
    margin: 0 auto var(--space-6);
  }

  h1 {
    margin: var(--space-1) 0;
    font-family: var(--font-wordmark);
    font-size: var(--text-3xl);
    font-weight: var(--wordmark-weight);
    letter-spacing: var(--wordmark-tracking);
  }

  .note {
    color: var(--muted);
    font-size: var(--text-xs);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-5);
    max-width: 1100px;
    margin: 0 auto;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  @media (max-width: 720px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
