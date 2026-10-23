<script>
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Section from '../ui/Section.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import FontsDialog from './FontsDialog.svelte';
  import LayersList from './LayersList.svelte';
  import { plural, t } from '../../lib/i18n/index.svelte.js';
  import { isValidSlug } from '../../lib/domain/slugs.js';
  import { formatBytes, projectStats } from '../../lib/domain/model.js';
  import { STAGE_MAX, STAGE_MIN } from '../../lib/domain/stage.js';
  import {
    addPage,
    duplicatePage,
    makeStartPage,
    removePage,
    renamePageSlug,
    renamePageTitle,
    session,
    updatePage,
    updateStageSize
  } from '../../lib/state/project.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { page } = $props();

  let titleDraft = $state('');
  let slugDraft = $state('');
  let slugError = $state('');
  let widthDraft = $state(0);
  let heightDraft = $state(0);
  let confirming = $state(false);
  let fontsOpen = $state(false);

  const summary = $derived(session.project ? projectStats(session.project) : null);
  const stage = $derived(session.project?.stage);
  const isStart = $derived(page.id === session.project?.startPageId);

  $effect(() => {
    titleDraft = page.title;
    slugDraft = page.slug;
    slugError = '';
    widthDraft = session.project?.stage?.width ?? 0;
    heightDraft = session.project?.stage?.height ?? 0;
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

  function setTransition(value) {
    apply(() => updatePage(page.id, { transition: value }));
  }

  function setBackground(value) {
    apply(() =>
      updatePage(
        page.id,
        { background: { color: value } },
        {
          coalesceKey: `bg:${page.id}`
        }
      )
    );
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

  <Section label={t('page.size')}>
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
    </div>
    <p class="hint">{t('page.sizeHint')}</p>
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
    <Field
      label={t('inspector.background')}
      type="color"
      value={page.background?.color ?? '#fffdf7'}
      oninput={(event) => setBackground(event.currentTarget.value)}
    />
  </Section>

  <Section label={t('page.actions')}>
    <div class="row">
      <Button
        size="sm"
        variant="ghost"
        onclick={() =>
          apply(() =>
            addPage(t('page.newTitle', { number: session.project.pages.length + 1 }))
          )}
      >
        {t('page.add')}
      </Button>
      <Button size="sm" variant="secondary" onclick={duplicate}>
        {t('page.duplicate')}
      </Button>
      {#if !isStart}
        <Button
          size="sm"
          variant="ghost"
          onclick={() => apply(() => makeStartPage(page.id))}
        >
          {t('page.makeStart')}
        </Button>
      {:else}
        <span class="stamp">{t('page.start')}</span>
      {/if}
    </div>
  </Section>

  <Section label={t('layers.title')}>
    <LayersList {page} />
  </Section>

  <Section label={t('fonts.title')}>
    <div class="font-summary">
      <span>
        {plural(
          Object.keys(session.project.fonts ?? {}).length,
          'units.fontOne',
          'units.fontMany'
        )}
      </span>
      <Button size="sm" variant="ghost" onclick={() => (fontsOpen = true)}>
        {t('fonts.manage')}
      </Button>
    </div>
  </Section>

  {#if summary}
    <Section label={t('projectMenu.title')}>
      <p class="summary">
        {plural(summary.pages, 'units.pageOne', 'units.pageMany')} ·
        {plural(summary.media, 'units.assetOne', 'units.assetMany')} ·
        {formatBytes(summary.bytes)}
      </p>
    </Section>
  {/if}

  <div class="danger-zone">
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
  </div>
</div>

<FontsDialog bind:open={fontsOpen} />

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

  .font-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .summary {
    color: var(--ink-2);
    font-size: var(--text-xs);
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

  .danger-zone {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
  }
</style>
