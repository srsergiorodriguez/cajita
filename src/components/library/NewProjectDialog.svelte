<script>
  import Button from '../ui/Button.svelte';
  import Dialog from '../ui/Dialog.svelte';
  import Field from '../ui/Field.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import Select from '../ui/Select.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { STAGE_PRESETS } from '../../lib/domain/model.js';
  import { STAGE_MAX, STAGE_MIN } from '../../lib/domain/stage.js';
  import { PAPER_PRESETS, DEFAULT_PRINT_MARGINS, printContentSize } from '../../lib/domain/print.js';
  import { createAndOpenProject } from '../../lib/state/project.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { open = $bindable(false), oncreated } = $props();

  let title = $state('');
  let locale = $state('es');
  let stagePreset = $state('wide');
  let stageWidth = $state(1200);
  let stageHeight = $state(800);
  let busy = $state(false);
  let format = $state('web');
  let paperPreset = $state('a5');
  let orientation = $state('portrait');
  let margins = $state({ ...DEFAULT_PRINT_MARGINS });

  const printSetup = $derived.by(() => {
    try {
      return {
        paper: { preset: paperPreset },
        orientation,
        margins: { ...margins }
      };
    } catch {
      return null;
    }
  });
  const printRatio = $derived.by(() => {
    try {
      return printContentSize(printSetup);
    } catch {
      return null;
    }
  });

  const stageOptions = [
    ...STAGE_PRESETS.map((preset) => ({
      value: preset.id,
      label: `${preset.label} · ${preset.width}×${preset.height}`
    })),
    { value: 'custom', label: t('new.stageCustom') }
  ];

  async function create() {
    if (busy) return;
    if (format === 'print' && !printRatio) {
      toast(t('new.printInvalid'), 'error');
      return;
    }
    const custom = stagePreset === 'custom' && format !== 'print';
    const width = Number(stageWidth);
    const height = Number(stageHeight);
    if (
      custom &&
      (!Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width < STAGE_MIN ||
        width > STAGE_MAX ||
        height < STAGE_MIN ||
        height > STAGE_MAX)
    ) {
      toast(t('new.stageInvalid', { min: STAGE_MIN, max: STAGE_MAX }), 'error');
      return;
    }
    busy = true;
    try {
      const project = await createAndOpenProject({
        title: title.trim() || t('new.namePlaceholder'),
        locale,
        stagePreset: custom ? 'wide' : stagePreset,
        stageWidth: custom ? width : undefined,
        stageHeight: custom ? height : undefined,
        print: format === 'print' ? printSetup : undefined
      });
      open = false;
      title = '';
      oncreated?.(project);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      busy = false;
    }
  }
</script>

<Dialog bind:open title={t('new.title')}>
  <Field
    label={t('new.name')}
    placeholder={t('new.namePlaceholder')}
    bind:value={title}
  />

  <div class="row">
    <div class="cell">
      <span class="mono-label">{t('new.language')}</span>
      <SegmentedControl
        label={t('new.language')}
        bind:value={locale}
        options={[
          { value: 'es', label: t('lang.es') },
          { value: 'en', label: t('lang.en') }
        ]}
      />
    </div>
  </div>

  <div class="cell">
    <span class="mono-label">{t('new.format')}</span>
    <SegmentedControl
      label={t('new.format')}
      bind:value={format}
      options={[
        { value: 'web', label: t('new.web') },
        { value: 'print', label: t('new.print') }
      ]}
    />
  </div>
  {#if format === 'print'}
    <Select
      label={t('new.paper')}
      bind:value={paperPreset}
      options={PAPER_PRESETS.map((paper) => ({ value: paper.id, label: `${paper.label} · ${paper.width} × ${paper.height} mm` }))}
    />
    <div class="cell">
      <span class="mono-label">{t('new.orientation')}</span>
      <SegmentedControl
        label={t('new.orientation')}
        bind:value={orientation}
        options={[
          { value: 'portrait', label: t('new.portrait') },
          { value: 'landscape', label: t('new.landscape') }
        ]}
      />
    </div>
    <div class="field-grid">
      {#each [['top', 'new.marginTop'], ['bottom', 'new.marginBottom'], ['inner', 'new.marginInner'], ['outer', 'new.marginOuter']] as [key, label] (key)}
        <Field label={t(label)} type="number" min="0" suffix="mm" value={margins[key]} oninput={(event) => (margins = { ...margins, [key]: Number(event.currentTarget.value) })} />
      {/each}
    </div>
    {#if printRatio}
      <p class="hint">{t('new.printRatio', { width: Math.round(printRatio.width), height: Math.round(printRatio.height) })}</p>
    {:else}
      <p class="error">{t('new.printInvalid')}</p>
    {/if}
  {:else}
    <Select label={t('new.stage')} bind:value={stagePreset} options={stageOptions} />
  {/if}
  {#if stagePreset === 'custom' && format !== 'print'}
    <div class="field-grid">
      <Field
        label={t('new.stageWidth')}
        type="number"
        min={STAGE_MIN}
        max={STAGE_MAX}
        suffix="px"
        bind:value={stageWidth}
      />
      <Field
        label={t('new.stageHeight')}
        type="number"
        min={STAGE_MIN}
        max={STAGE_MAX}
        suffix="px"
        bind:value={stageHeight}
      />
    </div>
  {/if}
  <div class="actions">
    <Button variant="ghost" onclick={() => (open = false)} disabled={busy}>
      {t('new.cancel')}
    </Button>
    <Button variant="accent" onclick={create} disabled={busy}>
      {t('new.create')}
    </Button>
  </div>
</Dialog>

<style>
  .row {
    display: flex;
    gap: var(--space-4);
  }

  .cell {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line-soft);
  }
</style>
