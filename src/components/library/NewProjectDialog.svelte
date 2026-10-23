<script>
  import Button from '../ui/Button.svelte';
  import Dialog from '../ui/Dialog.svelte';
  import Field from '../ui/Field.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import Select from '../ui/Select.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { STAGE_PRESETS } from '../../lib/domain/model.js';
  import { STAGE_MAX, STAGE_MIN } from '../../lib/domain/stage.js';
  import { createAndOpenProject } from '../../lib/state/project.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { open = $bindable(false), oncreated } = $props();

  let title = $state('');
  let locale = $state('es');
  let stagePreset = $state('wide');
  let stageWidth = $state(1200);
  let stageHeight = $state(800);
  let busy = $state(false);

  const stageOptions = [
    ...STAGE_PRESETS.map((preset) => ({
      value: preset.id,
      label: `${preset.label} · ${preset.width}×${preset.height}`
    })),
    { value: 'custom', label: t('new.stageCustom') }
  ];

  async function create() {
    if (busy) return;
    const custom = stagePreset === 'custom';
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
        stageHeight: custom ? height : undefined
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

  <Select label={t('new.stage')} bind:value={stagePreset} options={stageOptions} />
  {#if stagePreset === 'custom'}
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
