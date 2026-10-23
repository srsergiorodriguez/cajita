<script>
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import RangeField from '../ui/RangeField.svelte';
  import Section from '../ui/Section.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import Select from '../ui/Select.svelte';
  import FichaCard from '../cards/FichaCard.svelte';
  import ImageMaskDialog from './ImageMaskDialog.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { BUILTIN_FONTS } from '../../lib/domain/elements.js';
  import { emptyMeta, hasMetaContent } from '../../lib/domain/links.js';
  import { fichaCardRows, fichaRecord } from '../../lib/domain/fichas.js';
  import {
    activePage,
    deleteElements,
    duplicateElementById,
    moveLayer,
    session,
    updateElement
  } from '../../lib/state/project.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { element } = $props();

  let frame = $state({ x: 0, y: 0, w: 1, h: 1, rotation: 0 });
  let text = $state('');
  let metaDraft = $state(emptyMeta());
  let urlDraft = $state('');
  let urlError = $state('');
  let confirming = $state(false);
  let maskOpen = $state(false);

  $effect(() => {
    if (element) {
      frame = { ...element.frame };
      text = element.text ?? '';
      metaDraft = { ...emptyMeta(), ...(element.meta ?? {}) };
      urlDraft = element.link?.kind === 'url' ? element.link.url : '';
      urlError = '';
      confirming = false;
    }
  });

  const page = $derived(activePage());
  const currentFicha = $derived(
    element.type === 'ficha' ? fichaRecord(session.project, element.fichaId) : null
  );
  const fichaRows = $derived(
    currentFicha ? fichaCardRows(session.project, currentFicha) : []
  );
  const typographySummary = $derived(
    `${t('text.lineHeight')} ${element.lineHeight} · ${t('text.letterSpacing')} ${element.letterSpacing}px`
  );
  const geometrySummary = $derived(
    `x ${Math.round(frame.x)} · y ${Math.round(frame.y)} · ${Math.round(frame.w)}×${Math.round(frame.h)} · ${Math.round(frame.rotation)}°`
  );
  const linkKind = $derived(element.link?.kind ?? 'none');
  const hasMask = $derived((element.mask?.length ?? 0) >= 3);
  const linkPages = $derived(session.project?.pages ?? []);
  const linkOptions = $derived([
    { value: 'none', label: t('link.none') },
    { value: 'page', label: t('link.page') },
    { value: 'url', label: t('link.url') },
    ...(element.link?.kind === 'meta' || hasMetaContent(element.meta)
      ? [{ value: 'meta', label: t('link.metaLegacy') }]
      : [])
  ]);
  const fontOptions = $derived([
    ...BUILTIN_FONTS.map((font) => ({ value: font.id, label: font.label })),
    ...Object.values(session.project?.fonts ?? {}).map((font) => ({
      value: font.id,
      label: font.name
    }))
  ]);

  function apply(action) {
    try {
      action();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function setFrame(key, value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    if ((key === 'w' || key === 'h') && number < 1) return;
    frame = { ...frame, [key]: number };
    apply(() =>
      updateElement(
        element.id,
        { frame: { [key]: number } },
        {
          coalesceKey: `frame:${element.id}:${key}`
        }
      )
    );
  }

  function setText(value) {
    text = value;
    apply(() =>
      updateElement(
        element.id,
        { text: value },
        {
          coalesceKey: `text:${element.id}`
        }
      )
    );
  }

  function setField(key, value) {
    apply(() => updateElement(element.id, { [key]: value }));
  }

  function setNumberField(key, value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    apply(() =>
      updateElement(
        element.id,
        { [key]: number },
        {
          coalesceKey: `${element.id}:${key}`
        }
      )
    );
  }

  function setLinkKind(kind) {
    if (kind === 'none') {
      apply(() => updateElement(element.id, { link: null }));
      return;
    }
    if (kind === 'page') {
      const fallback = linkPages[0]?.id;
      const pageId = element.link?.kind === 'page' ? element.link.pageId : fallback;
      if (pageId) {
        apply(() => updateElement(element.id, { link: { kind: 'page', pageId } }));
      }
      return;
    }
    if (kind === 'url') {
      const url = element.link?.kind === 'url' ? element.link.url : 'https://';
      const newTab = element.link?.kind === 'url' ? Boolean(element.link.newTab) : false;
      urlDraft = url;
      apply(() => updateElement(element.id, { link: { kind: 'url', url, newTab } }));
      return;
    }
    if (kind === 'meta') {
      const meta = hasMetaContent(element.meta)
        ? { ...emptyMeta(), ...element.meta }
        : { ...emptyMeta(), title: element.name || text.slice(0, 40) || t('meta.title') };
      metaDraft = meta;
      apply(() => updateElement(element.id, { link: { kind: 'meta' }, meta }));
    }
  }

  function setLinkPage(pageId) {
    apply(() => updateElement(element.id, { link: { kind: 'page', pageId } }));
  }

  function setUrlDraft(value) {
    urlDraft = value;
    urlError = '';
  }

  function commitUrl() {
    if (!/^(https?:|mailto:|tel:)/i.test(urlDraft.trim())) {
      urlError = t('link.invalid');
      return;
    }
    const newTab = element.link?.kind === 'url' ? Boolean(element.link.newTab) : false;
    apply(() =>
      updateElement(element.id, { link: { kind: 'url', url: urlDraft.trim(), newTab } })
    );
  }

  function setLinkWindow(value) {
    const url =
      element.link?.kind === 'url' ? element.link.url : urlDraft.trim() || 'https://';
    apply(() =>
      updateElement(element.id, {
        link: { kind: 'url', url, newTab: value === 'new' }
      })
    );
  }

  function setMetaDraft(key, value) {
    metaDraft = { ...metaDraft, [key]: value };
  }

  function commitMeta() {
    apply(() => updateElement(element.id, { meta: { ...metaDraft } }));
  }

  function duplicate() {
    apply(() => duplicateElementById(element.id));
  }

  function remove() {
    apply(() => {
      deleteElements([element.id]);
      confirming = false;
    });
  }
</script>

<div class="inspector-body">
  {#if element.type === 'text'}
    <Section label={t('text.title')}>
      <label class="text-label">
        <span>{t('text.content')}</span>
        <textarea
          value={text}
          rows="4"
          oninput={(event) => setText(event.currentTarget.value)}></textarea>
      </label>
      <Select
        label={t('text.font')}
        value={element.font}
        options={fontOptions}
        onchange={(value) => setField('font', value)}
      />
      <div class="text-row">
        <Field
          label={t('text.size')}
          type="number"
          value={element.fontSize}
          suffix="px"
          oninput={(event) => setNumberField('fontSize', event.currentTarget.value)}
        />
        <Field
          label={t('text.color')}
          type="color"
          value={element.color}
          oninput={(event) => setField('color', event.currentTarget.value)}
        />
        <div class="align-control">
          <span class="param-label">{t('text.align')}</span>
          <SegmentedControl
            label={t('text.align')}
            value={element.align}
            options={[
              { value: 'left', label: t('text.left'), icon: 'align-left' },
              { value: 'center', label: t('text.center'), icon: 'align-center' },
              { value: 'right', label: t('text.right'), icon: 'align-right' }
            ]}
            onchange={(value) => setField('align', value)}
          />
        </div>
      </div>
      <label class="check">
        <input
          type="checkbox"
          checked={Boolean(element.heading)}
          onchange={(event) => setField('heading', event.currentTarget.checked)}
        />
        <span>{t('text.heading')}</span>
      </label>
    </Section>

    <Section label={t('text.precise')} collapsible summary={typographySummary}>
      <div class="field-grid">
        <Field
          label={t('text.lineHeight')}
          type="number"
          value={element.lineHeight}
          oninput={(event) => setNumberField('lineHeight', event.currentTarget.value)}
        />
        <Field
          label={t('text.letterSpacing')}
          type="number"
          value={element.letterSpacing}
          suffix="px"
          oninput={(event) => setNumberField('letterSpacing', event.currentTarget.value)}
        />
      </div>
    </Section>
  {/if}

  {#if element.type === 'image'}
    <Section label={t('image.title')}>
      <Field
        label={t('image.alt')}
        value={element.alt}
        oninput={(event) => setField('alt', event.currentTarget.value)}
      />
      <div class="segmented-row">
        <span class="param-label">{t('image.fit')}</span>
        <SegmentedControl
          label={t('image.fit')}
          value={element.fit}
          options={[
            { value: 'cover', label: t('image.cover') },
            { value: 'contain', label: t('image.contain') }
          ]}
          onchange={(value) => setField('fit', value)}
        />
      </div>
      <label class="check">
        <input
          type="checkbox"
          checked={Boolean(element.pixelated)}
          onchange={(event) => setField('pixelated', event.currentTarget.checked)}
        />
        <span>{t('image.pixelated')}</span>
      </label>
      <div class="mask-row">
        <span class="param-label">{t('mask.title')}</span>
        <Button size="sm" variant="ghost" onclick={() => (maskOpen = true)}>
          {hasMask ? t('mask.edit') : t('mask.add')}
        </Button>
      </div>
      {#if hasMask}<p class="hint">{t('image.maskedFit')}</p>{/if}
    </Section>
  {/if}

  {#if element.type === 'video'}
    <Section label={t('video.title')}>
      <div class="segmented-row">
        <span class="param-label">{t('video.fit')}</span>
        <SegmentedControl
          label={t('video.fit')}
          value={element.fit}
          options={[
            { value: 'cover', label: t('image.cover') },
            { value: 'contain', label: t('image.contain') }
          ]}
          onchange={(value) => setField('fit', value)}
        />
      </div>
      <label class="check">
        <input
          type="checkbox"
          checked={element.controls !== false}
          onchange={(event) => setField('controls', event.currentTarget.checked)}
        />
        <span>{t('video.controls')}</span>
      </label>
      <label class="check">
        <input
          type="checkbox"
          checked={Boolean(element.autoplay)}
          onchange={(event) => setField('autoplay', event.currentTarget.checked)}
        />
        <span>{t('video.autoplay')}</span>
      </label>
      <label class="check">
        <input
          type="checkbox"
          checked={Boolean(element.loop)}
          onchange={(event) => setField('loop', event.currentTarget.checked)}
        />
        <span>{t('video.loop')}</span>
      </label>
      <label class="check">
        <input
          type="checkbox"
          checked={Boolean(element.muted)}
          onchange={(event) => setField('muted', event.currentTarget.checked)}
        />
        <span>{t('video.muted')}</span>
      </label>
    </Section>
  {/if}

  {#if element.type === 'audio'}
    <Section label={t('audio.title')}>
      <Field
        label={t('audio.label')}
        value={element.label}
        oninput={(event) => setField('label', event.currentTarget.value)}
      />
      <label class="check">
        <input
          type="checkbox"
          checked={element.controls !== false}
          onchange={(event) => setField('controls', event.currentTarget.checked)}
        />
        <span>{t('audio.controls')}</span>
      </label>
      <label class="check">
        <input
          type="checkbox"
          checked={Boolean(element.autoplay)}
          onchange={(event) => setField('autoplay', event.currentTarget.checked)}
        />
        <span>{t('audio.autoplay')}</span>
      </label>
      <label class="check">
        <input
          type="checkbox"
          checked={Boolean(element.loop)}
          onchange={(event) => setField('loop', event.currentTarget.checked)}
        />
        <span>{t('audio.loop')}</span>
      </label>
    </Section>
  {/if}

  {#if element.type === 'ficha'}
    <Section label={t('ficha.title')}>
      {#if currentFicha}
        <div class="ficha-summary">
          <span class="mono-label">{currentFicha.code}</span>
          <strong>{currentFicha.label}</strong>
        </div>
        {#if fichaRows.length}
          <dl class="ficha-fields">
            {#each fichaRows as row (row.field.id)}
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            {/each}
          </dl>
        {:else}
          <p class="hint">{t('ficha.noFields')}</p>
        {/if}
        <p class="hint">{t('ficha.inspectorHint')}</p>
      {:else}
        <p class="hint">{t('ficha.missing')}</p>
      {/if}
    </Section>
  {/if}

  {#if element.type === 'shape'}
    <Section label={t('shape.title')}>
      <SegmentedControl
        label={t('shape.kind')}
        value={element.shape}
        options={[
          { value: 'circle', label: t('shape.circle') },
          { value: 'square', label: t('shape.square') },
          { value: 'triangle', label: t('shape.triangle') }
        ]}
        onchange={(value) => setField('shape', value)}
      />
      <Field
        label={t('shape.fill')}
        type="color"
        value={element.fill}
        oninput={(event) => setField('fill', event.currentTarget.value)}
      />
      <Field
        label={t('shape.stroke')}
        type="color"
        value={element.stroke}
        oninput={(event) => setField('stroke', event.currentTarget.value)}
      />
      <Field
        label={t('shape.strokeWidth')}
        type="number"
        value={element.strokeWidth}
        min="0"
        max="40"
        oninput={(event) => setField('strokeWidth', Number(event.currentTarget.value))}
      />
    </Section>
  {/if}

  {#if element.type === 'embed'}
    <Section
      label={t(
        element.provider === 'observable'
          ? 'embed.observable'
          : element.provider === 'p5'
            ? 'embed.p5'
            : 'embed.youtube'
      )}
    >
      <Field
        label={t('embed.name')}
        value={element.title}
        oninput={(event) => setField('title', event.currentTarget.value)}
      />
      <Field
        label={t('embed.caption')}
        value={element.caption}
        oninput={(event) => setField('caption', event.currentTarget.value)}
      />
      <Field label={t('embed.source')} value={element.url} readonly />
      <p class="hint">{t('embed.liveNote')}</p>
    </Section>
  {/if}

  <Section label={t('element.precise')} collapsible summary={geometrySummary}>
    <div class="field-grid">
      <Field
        label={t('element.x')}
        type="number"
        value={frame.x}
        oninput={(event) => setFrame('x', event.currentTarget.value)}
      />
      <Field
        label={t('element.y')}
        type="number"
        value={frame.y}
        oninput={(event) => setFrame('y', event.currentTarget.value)}
      />
      <Field
        label={t('element.w')}
        type="number"
        value={frame.w}
        oninput={(event) => setFrame('w', event.currentTarget.value)}
      />
      <Field
        label={t('element.h')}
        type="number"
        value={frame.h}
        oninput={(event) => setFrame('h', event.currentTarget.value)}
      />
      <Field
        label={t('element.rotation')}
        type="number"
        value={frame.rotation}
        suffix="°"
        oninput={(event) => setFrame('rotation', event.currentTarget.value)}
      />
    </div>
    <RangeField
      label={t('element.opacity')}
      value={element.opacity}
      min={0.05}
      max={1}
      step={0.05}
      oninput={(value) => setField('opacity', value)}
    />
  </Section>


  {#if element.type !== 'embed' && element.type !== 'ficha'}
    <Section label={t('link.title')}>
      <Select
        label={t('link.type')}
        value={linkKind}
        options={linkOptions}
        onchange={setLinkKind}
      />
      <p class="hint">{t('link.oneAction')}</p>

      {#if linkKind === 'page'}
        <Select
          label={t('link.target')}
          value={element.link?.pageId ?? ''}
          options={linkPages.map((item) => ({
            value: item.id,
            label: `${item.title} /${item.slug}`
          }))}
          onchange={setLinkPage}
        />
        {#if element.link?.pageId === page?.id}
          <p class="hint">{t('link.self')}</p>
        {/if}
      {:else if linkKind === 'url'}
        <Field
          label={t('link.url')}
          value={urlDraft}
          hint={urlError || t('link.urlHint')}
          oninput={(event) => setUrlDraft(event.currentTarget.value)}
          onchange={commitUrl}
        />
        <div class="segmented-row">
          <span class="param-label">{t('link.window')}</span>
          <SegmentedControl
            label={t('link.window')}
            value={element.link?.kind === 'url' && element.link.newTab ? 'new' : 'same'}
            options={[
              { value: 'same', label: t('link.sameWindow') },
              { value: 'new', label: t('link.newWindow') }
            ]}
            onchange={setLinkWindow}
          />
        </div>
      {:else if linkKind === 'meta'}
        <FichaCard {element} />
        <p class="hint">{t('meta.preview')}</p>
      {/if}
    </Section>

    {#if linkKind === 'meta' || hasMetaContent(element.meta)}
      <Section label={t('meta.title')}>
        {#each ['title', 'creator', 'date', 'medium', 'rights', 'source', 'description'] as field (field)}
          <Field
            label={t(`meta.${field === 'title' ? 'titleField' : field}`)}
            value={metaDraft[field]}
            oninput={(event) => setMetaDraft(field, event.currentTarget.value)}
            onchange={commitMeta}
          />
        {/each}
      </Section>
    {/if}
  {/if}

  <ImageMaskDialog bind:open={maskOpen} {element} />

  <Section label={t('element.actions')}>
    <div class="action-grid">
      <Button size="sm" variant="secondary" onclick={duplicate}>
        {t('element.duplicate')}
      </Button>
      <Button size="sm" variant="ghost" onclick={() => moveLayer(element.id, 999)}>
        {t('element.bringFront')}
      </Button>
      <Button size="sm" variant="ghost" onclick={() => moveLayer(element.id, -999)}>
        {t('element.sendBack')}
      </Button>
    </div>
    <div class="danger-row">
      {#if confirming}
        <span>{t('element.delete')}</span>
        <Button size="sm" variant="ghost" onclick={() => (confirming = false)}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" variant="danger" onclick={remove}>
          {t('common.delete')}
        </Button>
      {:else}
        <Button size="sm" variant="danger" onclick={() => (confirming = true)}>
          {t('element.delete')}
        </Button>
      {/if}
    </div>
  </Section>
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

  .text-row {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 0.8fr) auto;
    align-items: end;
    gap: var(--space-2);
  }

  .align-control {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .text-label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .text-label span {
    color: var(--muted);
    font-size: var(--text-2xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  textarea {
    width: 100%;
    min-height: 74px;
    padding: 5px 6px;
    border: var(--border-control) solid var(--line);
    border-radius: 0;
    background: var(--panel-2);
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    line-height: 1.35;
    resize: vertical;
  }

  textarea:focus {
    outline: var(--focus-ring-width) solid var(--focus);
    outline-offset: 0;
  }

  .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-2);
    font-size: var(--text-xs);
  }

  .check input {
    accent-color: var(--accent);
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }

  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1);
  }

  .action-grid :global(.btn) {
    width: 100%;
  }

  .action-grid :global(.btn:first-child) {
    grid-column: 1 / -1;
  }

  .danger-row {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding-top: var(--space-2);
    border-top: 1px solid var(--line-soft);
    color: var(--danger);
    font-size: var(--text-2xs);
  }

  .danger-row :global(.btn:only-child) {
    width: 100%;
  }

  .danger-row span {
    flex: 1;
  }

  .ficha-summary {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ficha-summary strong {
    font-family: var(--font-wordmark);
    font-size: var(--text-lg);
    font-weight: var(--wordmark-weight);
  }

  .ficha-fields {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr);
    gap: 3px 8px;
    margin: 0;
  }

  .ficha-fields dt {
    color: var(--muted);
    font-size: var(--text-2xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .ficha-fields dd {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: var(--text-xs);
  }

  .mask-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--line-soft);
  }
</style>
