<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Select from '../ui/Select.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import Section from '../ui/Section.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { PAPER_PRESETS, normalisePrint, printContentSize } from '../../lib/domain/print.js';
  import { session, updatePrintSettings } from '../../lib/state/project.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { open = $bindable(false) } = $props();
  let draft = $state(normalisePrint({}));
  let originalRatio = $state(1);
  const content = $derived.by(() => {
    try {
      return printContentSize(draft);
    } catch {
      return null;
    }
  });
  const geometryChanged = $derived(
    Boolean(content && originalRatio && Math.abs(content.ratio - originalRatio) > 0.0001)
  );

  $effect(() => {
    if (!open || !session.project?.print) return;
    const next = normalisePrint(structuredClone($state.snapshot(session.project.print)));
    draft = next;
    try {
      originalRatio = printContentSize(next).ratio;
    } catch {
      originalRatio = 0;
    }
  });

  function setPaper(preset) {
    const paper = PAPER_PRESETS.find((item) => item.id === preset) ?? PAPER_PRESETS[0];
    draft = {
      ...draft,
      paper: { ...draft.paper, preset: paper.id, width: paper.width, height: paper.height }
    };
  }

  function setMargin(key, value) {
    draft = { ...draft, margins: { ...draft.margins, [key]: Number(value) } };
  }

  function setNumbering(patch) {
    draft = { ...draft, numbering: { ...draft.numbering, ...patch } };
  }

  function setRunningHead(patch) {
    draft = { ...draft, runningHead: { ...draft.runningHead, ...patch } };
  }

  function setToc(patch) {
    draft = { ...draft, toc: { ...draft.toc, ...patch } };
  }

  function setImposition(mode) {
    draft = { ...draft, imposition: { ...draft.imposition, mode } };
  }

  function save() {
    if (!content) {
      toast(t('print.invalidMargins'), 'error');
      return;
    }
    try {
      updatePrintSettings(draft);
      open = false;
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }
</script>

<Dialog bind:open title={t('print.settings')} wide>
  <Section label={t('new.paper')}>
    <div class="field-grid">
      <Select
        label={t('new.paper')}
        value={draft.paper.preset}
        options={PAPER_PRESETS.map((paper) => ({ value: paper.id, label: `${t(`paper.${paper.id}`)} · ${paper.width} × ${paper.height} mm` }))}
        onchange={setPaper}
      />
      <div class="cell">
        <span class="mono-label">{t('new.orientation')}</span>
        <SegmentedControl
          label={t('new.orientation')}
          value={draft.orientation}
          options={[
            { value: 'portrait', label: t('new.portrait') },
            { value: 'landscape', label: t('new.landscape') }
          ]}
          onchange={(orientation) => (draft = { ...draft, orientation })}
        />
      </div>
      <Field label={t('new.marginTop')} type="number" min="0" suffix="mm" value={draft.margins.top} oninput={(event) => setMargin('top', event.currentTarget.value)} />
      <Field label={t('new.marginBottom')} type="number" min="0" suffix="mm" value={draft.margins.bottom} oninput={(event) => setMargin('bottom', event.currentTarget.value)} />
      <Field label={t('new.marginInner')} type="number" min="0" suffix="mm" value={draft.margins.inner} oninput={(event) => setMargin('inner', event.currentTarget.value)} />
      <Field label={t('new.marginOuter')} type="number" min="0" suffix="mm" value={draft.margins.outer} oninput={(event) => setMargin('outer', event.currentTarget.value)} />
    </div>
    {#if content}
      <p class="hint">{t('new.printRatio', { width: Math.round(content.width), height: Math.round(content.height) })}</p>
    {:else}
      <p class="error">{t('new.printInvalid')}</p>
    {/if}
    {#if geometryChanged}
      <p class="warning">{t('print.geometryWarning')}</p>
    {/if}
  </Section>

  <Section label={t('print.numbering')}>
    <label class="check"><input type="checkbox" checked={draft.numbering.enabled} onchange={(event) => setNumbering({ enabled: event.currentTarget.checked })} /><span>{t('print.numberingEnabled')}</span></label>
    <div class="field-grid">
      <Field label={t('print.start')} type="number" min="1" value={draft.numbering.start} oninput={(event) => setNumbering({ start: Number(event.currentTarget.value) })} />
      <Select label={t('print.format')} value={draft.numbering.format} options={[{ value: '1', label: '1' }, { value: '01', label: '01' }, { value: '1 / N', label: '1 / N' }]} onchange={(format) => setNumbering({ format })} />
      <Select label={t('print.position')} value={draft.numbering.position} options={[
        { value: 'bottom-outer', label: t('print.bottomOuter') },
        { value: 'bottom-center', label: t('print.bottomCenter') },
        { value: 'bottom-inner', label: t('print.bottomInner') },
        { value: 'top-outer', label: t('print.topOuter') },
        { value: 'top-center', label: t('print.topCenter') },
        { value: 'top-inner', label: t('print.topInner') }
      ]} onchange={(position) => setNumbering({ position })} />
    </div>
    <label class="check"><input type="checkbox" checked={draft.numbering.hideOnFirst} onchange={(event) => setNumbering({ hideOnFirst: event.currentTarget.checked })} /><span>{t('print.hideOnFirst')}</span></label>
  </Section>

  <Section label={t('print.runningHead')}>
    <label class="check"><input type="checkbox" checked={draft.runningHead.enabled} onchange={(event) => setRunningHead({ enabled: event.currentTarget.checked })} /><span>{t('print.runningHeadEnabled')}</span></label>
    <div class="field-grid">
      <Select label={t('print.content')} value={draft.runningHead.content} options={[
        { value: 'page-title', label: t('print.pageTitle') },
        { value: 'project-title', label: t('print.projectTitle') },
        { value: 'none', label: t('print.none') }
      ]} onchange={(content) => setRunningHead({ content })} />
      <Select label={t('print.position')} value={draft.runningHead.position} options={[
        { value: 'top-outer', label: t('print.topOuter') },
        { value: 'top-center', label: t('print.topCenter') },
        { value: 'top-inner', label: t('print.topInner') }
      ]} onchange={(position) => setRunningHead({ position })} />
    </div>
    <label class="check"><input type="checkbox" checked={draft.runningHead.hideOnFirst} onchange={(event) => setRunningHead({ hideOnFirst: event.currentTarget.checked })} /><span>{t('print.hideOnFirst')}</span></label>
  </Section>

  <Section label={t('print.toc')}>
    <label class="check"><input type="checkbox" checked={draft.toc.enabled} onchange={(event) => setToc({ enabled: event.currentTarget.checked })} /><span>{t('print.tocEnabled')}</span></label>
    <Field label={t('print.tocTitle')} value={draft.toc.title} oninput={(event) => setToc({ title: event.currentTarget.value })} />
  </Section>

  <Section label={t('print.imposition')}>
    <Select
      label={t('print.impositionMode')}
      value={draft.imposition.mode}
      options={[
        { value: 'none', label: t('print.impositionNone') },
        { value: 'spread', label: t('print.impositionSpread') },
        { value: 'booklet', label: t('print.impositionBooklet') }
      ]}
      onchange={setImposition}
    />
    <p class="hint">{t('print.impositionHint')}</p>
  </Section>

  <div class="actions">
    <Button variant="ghost" onclick={() => (open = false)}>{t('common.cancel')}</Button>
    <Button variant="accent" onclick={save}>{t('common.save')}</Button>
  </div>
</Dialog>

<style>
  .field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); }
  .cell { display: flex; flex-direction: column; gap: var(--space-1); }
  .hint { color: var(--muted); font-size: var(--text-2xs); line-height: 1.4; }
  .error { color: var(--danger); font-size: var(--text-2xs); }
  .warning { color: var(--warning); font-size: var(--text-2xs); line-height: 1.4; }
  .check { display: flex; align-items: center; gap: 5px; font-size: var(--text-xs); }
  .actions { display: flex; justify-content: flex-end; gap: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--line-soft); }
</style>
