<script>
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Section from '../ui/Section.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import Select from '../ui/Select.svelte';
  import LayersList from './LayersList.svelte';
  import ColorField from './ColorField.svelte';
  import PageTemplatesDialog from './PageTemplatesDialog.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { isValidSlug } from '../../lib/domain/slugs.js';
  import { STAGE_MAX, STAGE_MIN } from '../../lib/domain/stage.js';
  import {
    duplicatePage,
    makeStartPage,
    removePage,
    renamePageSlug,
    renamePageTitle,
    session,
    assignPageGrid,
    updatePage,
    updateStageLimits,
    updateStageSize
  } from '../../lib/state/project.svelte.js';
  import { editor, togglePrintMargins } from '../../lib/state/editor.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { page } = $props();

  let titleDraft = $state('');
  let slugDraft = $state('');
  let slugError = $state('');
  let widthDraft = $state(0);
  let heightDraft = $state(0);
  let minWidthDraft = $state(360);
  let maxWidthDraft = $state(1280);
  let confirming = $state(false);
  let templatesOpen = $state(false);

  const stage = $derived(session.project?.stage);
  const isStart = $derived(page.id === session.project?.startPageId);

  $effect(() => {
    titleDraft = page.title;
    slugDraft = page.slug;
    slugError = '';
    widthDraft = session.project?.stage?.width ?? 0;
    heightDraft = session.project?.stage?.height ?? 0;
    minWidthDraft = session.project?.stage?.minWidth ?? 360;
    maxWidthDraft = session.project?.stage?.maxWidth ?? session.project?.stage?.width ?? 1200;
    confirming = false;
  });

  function apply(action) {
    try {
      action();
      slugError = '';
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function setTitle(value) {
    titleDraft = value;
    if (!value.trim()) return;
    apply(() => renamePageTitle(page.id, value, { coalesceKey: `title:${page.id}` }));
  }

  function setSlugDraft(value) {
    slugDraft = value.trim().toLowerCase();
    slugError = isValidSlug(slugDraft) ? '' : t('page.slugInvalid');
  }

  function commitSlug() {
    if (!isValidSlug(slugDraft)) {
      slugError = t('page.slugInvalid');
      return;
    }
    apply(() => renamePageSlug(page.id, slugDraft));
  }

  function setDimension(axis, value) {
    const nextWidth = axis === 'width' ? Number(value) : Number(widthDraft);
    const nextHeight = axis === 'height' ? Number(value) : Number(heightDraft);
    if (!nextWidth || !nextHeight) {
      widthDraft = stage.width;
      heightDraft = stage.height;
      return;
    }
    apply(() =>
      updateStageSize(nextWidth, nextHeight, {
        coalesceKey: 'stage-size'
      })
    );
  }

  function setLimit(axis, value) {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) return;
    const min = axis === 'min' ? next : minWidthDraft;
    const max = axis === 'max' ? next : maxWidthDraft;
    apply(() => updateStageLimits(min, max));
  }

  function setTransition(value) {
    apply(() => updatePage(page.id, { transition: value }));
  }

  function setBackground({ value, token, index }) {
    apply(() =>
      updatePage(
        page.id,
        { background: { ...(page.background ?? {}), color: value, token, index } },
        {
          coalesceKey: `bg:${page.id}`
        }
      )
    );
  }

  function setGrid(value) {
    apply(() => assignPageGrid(page.id, value));
  }

  function duplicate() {
    apply(() => duplicatePage(page.id));
  }

  function remove() {
    apply(() => {
      removePage(page.id);
      confirming = false;
    });
  }
</script>

<div class="inspector-body">
  <Section label={t('page.details')}>
    <div class="field-grid">
      <Field
        label={t('page.title')}
        value={titleDraft}
        oninput={(event) => setTitle(event.currentTarget.value)}
      />
      <Field
        label={t('page.slug')}
        value={slugDraft}
        oninput={(event) => setSlugDraft(event.currentTarget.value)}
        onchange={commitSlug}
      />
    </div>
    {#if slugError}<p class="error">{slugError}</p>{/if}
  </Section>

  <Section label={t('page.canvas')} collapsible>
    <div class="field-grid">
      <Field
        label={t('page.width')}
        type="number"
        min={STAGE_MIN}
        max={STAGE_MAX}
        step="1"
        suffix="px"
        value={widthDraft}
        oninput={(event) => {
          widthDraft = event.currentTarget.value;
        }}
        onchange={(event) => setDimension('width', event.currentTarget.value)}
      />
      <Field
        label={t('page.height')}
        type="number"
        min={STAGE_MIN}
        max={STAGE_MAX}
        step="1"
        suffix="px"
        value={heightDraft}
        oninput={(event) => {
          heightDraft = event.currentTarget.value;
        }}
        onchange={(event) => setDimension('height', event.currentTarget.value)}
      />
      <Field
        label={t('inspector.minWidth')}
        type="number"
        min={STAGE_MIN}
        max={STAGE_MAX}
        step="1"
        suffix="px"
        value={minWidthDraft}
        oninput={(event) => {
          minWidthDraft = event.currentTarget.value;
        }}
        onchange={(event) => setLimit('min', event.currentTarget.value)}
      />
      <Field
        label={t('inspector.maxWidth')}
        type="number"
        min={STAGE_MIN}
        max={STAGE_MAX}
        step="1"
        suffix="px"
        value={maxWidthDraft}
        oninput={(event) => {
          maxWidthDraft = event.currentTarget.value;
        }}
        onchange={(event) => setLimit('max', event.currentTarget.value)}
      />
    </div>
    <p class="hint">{t('page.sizeHint')}</p>
    <p class="hint">{t('page.limitHint')}</p>
    {#if session.project?.print}
      <label class="check">
        <input type="checkbox" checked={editor.showPrintMargins} onchange={togglePrintMargins} />
        <span>{t('print.showMargins')}</span>
      </label>
    {/if}
  </Section>

  <Section label={t('page.appearance')}>
    <div class="segmented-row">
      <span class="param-label">{t('inspector.transition')}</span>
      <SegmentedControl
        label={t('inspector.transition')}
        value={page.transition}
        options={[
          { value: 'cut', label: t('inspector.cut') },
          { value: 'fade', label: t('inspector.fade') },
          { value: 'slide', label: t('inspector.slide') }
        ]}
        onchange={setTransition}
      />
    </div>
    <p class="hint">{t('inspector.transitionHint')}</p>
    <ColorField
      label={t('inspector.background')}
      value={page.background?.color ?? '#ffffff'}
      token={page.background?.token}
      project={session.project}
      onchange={setBackground}
    />
  </Section>

  <Section label={t('layers.title')}>
    <LayersList {page} />
  </Section>

  <Section label={t('grid.section')} collapsible>
    <Select
      label={t('grid.pageGrid')}
      value={page.gridId ?? ''}
      options={[
        { value: '', label: t('grid.none') },
        ...Object.values(session.project?.grids ?? {}).map((grid) => ({
          value: grid.id,
          label: grid.name
        }))
      ]}
      onchange={(value) => apply(() => assignPageGrid(page.id, value))}
    />
    {#if page.gridId}
      <Button
        size="sm"
        variant="ghost"
        onclick={() => apply(() => assignPageGrid(page.id, ''))}
      >
        {t('grid.removeFromPage')}
      </Button>
    {/if}
    <p class="hint">{t('grid.pageHint')}</p>
  </Section>

  <Section label={t('templates.section')} collapsible>
    <p class="hint">{t('templates.pageHint')}</p>
    <div class="row">
      <Button size="sm" variant="secondary" onclick={() => (templatesOpen = true)}>
        {t('templates.open')}
      </Button>
    </div>
  </Section>

  <Section label={t('page.actions')} collapsible>
    <div class="row">
      <Button
        size="sm"
        variant="secondary"
        onclick={() => apply(() => duplicatePage(page.id))}
      >
        {t('page.duplicate')}
      </Button>
      {#if !isStart}
        <Button
          size="sm"
          variant="secondary"
          onclick={() => apply(() => makeStartPage(page.id))}
        >
          {t('page.makeStart')}
        </Button>
      {:else}
        <span class="stamp">{t('page.start')}</span>
      {/if}
    </div>
    {#if session.project.pages.length <= 1}
      <p class="hint">{t('page.onlyOne')}</p>
    {:else if confirming}
      <p class="hint">{t('page.deleteHint')}</p>
      <div class="row">
        <Button size="sm" variant="ghost" onclick={() => (confirming = false)}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" variant="danger" onclick={remove}>
          {t('common.delete')}
        </Button>
      </div>
    {:else}
      <Button size="sm" variant="danger" onclick={() => (confirming = true)}>
        {t('page.delete')}
      </Button>
    {/if}
  </Section>
  <PageTemplatesDialog bind:open={templatesOpen} {page} />
</div>

<style>
  .inspector-body {
    display: flex;
    flex-direction: column;
  }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .segmented-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .error {
    color: var(--danger);
    font-size: var(--text-2xs);
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }

  .hint {
    margin: 0 0 var(--space-2);
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
</style>
