<script>
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Select from '../ui/Select.svelte';
  import Icon from '../ui/Icon.svelte';
  import Section from '../ui/Section.svelte';
  import ShapeFields from '../inspector/ShapeFields.svelte';
  import MediaFitFields from '../inspector/MediaFitFields.svelte';
  import TextStyleFields from '../inspector/TextStyleFields.svelte';
  import LayersList from '../inspector/LayersList.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';

  let {
    composition,
    activeFrame,
    activeFrameIndex,
    width,
    height,
    sizeLabel,
    isButton,
    roleLabels,
    children,
    selected,
    fontOptions,
    mediaOptions,
    chosenMedia = $bindable(''),
    orderedChildren,
    selectedId,
    onwidth,
    onheight,
    onframe,
    oncomposition,
    oncopy,
    onselect,
    onupdate,
    onframeupdate,
    onremove,
    onaddbasic,
    onaddmedia,
    onnewdrawing,
    oneditdrawing,
    onreorder,
    onupdatechild,
    labelFor
  } = $props();
</script>

<Section label={sizeLabel}>
  <div class="grid-2">
    <Field label={t('button.width')} type="number" min="20" value={Math.round(width)} oninput={(event) => onwidth(Number(event.currentTarget.value))} />
    <Field label={t('button.height')} type="number" min="20" value={Math.round(height)} oninput={(event) => onheight(Number(event.currentTarget.value))} />
  </div>
</Section>

<Section label={t('composition.currentFrame')}>
  {#if isButton}
    <p class="current-state">{labelFor(activeFrame)}</p>
  {:else}
    <Field label={t('composition.frameName')} value={activeFrame.name} oninput={(event) => onframe({ name: event.currentTarget.value })} />
  {/if}
</Section>

{#if composition.preset === 'button'}
  <Section label={t('composition.copyState')}>
    <p class="hint">{t('composition.buttonRolesHint')}</p>
    <div class="state-copy">
      {#each composition.frames as target, index (target.id)}
        {#if index !== activeFrameIndex}
          <Button size="sm" variant="secondary" disabled={!children.length} onclick={() => oncopy(index)}>
            <Icon name="chevron-right" size={12} />{roleLabels[index]}
          </Button>
        {/if}
      {/each}
    </div>
  </Section>
{/if}

{#if composition.preset === 'animation'}
  <Section label={t('composition.timeline')}>
    <label class="check"><input type="checkbox" checked={composition.timeline.autoplay} onchange={(event) => oncomposition({ ...composition.timeline, autoplay: event.currentTarget.checked })} /><span>{t('composition.autoplay')}</span></label>
    <label class="check"><input type="checkbox" checked={composition.timeline.loop} onchange={(event) => oncomposition({ ...composition.timeline, loop: event.currentTarget.checked })} /><span>{t('composition.loop')}</span></label>
  </Section>
{/if}

{#if selected}
  <Section label={t('button.selected')}>
    {#snippet actions()}
      <Button size="sm" variant="ghost" onclick={onremove}><Icon name="trash" size={12} />{t('button.remove')}</Button>
    {/snippet}
    <div class="grid-2">
      {#each [['x', 'button.x'], ['y', 'button.y'], ['w', 'button.w'], ['h', 'button.h']] as [key, label] (key)}
        <Field label={t(label)} type="number" value={selected.frame[key]} oninput={(event) => onframeupdate(key, event.currentTarget.value)} />
      {/each}
    </div>
    {#if selected.type === 'text'}
      <Field label={t('button.text')} value={selected.text} oninput={(event) => onupdate({ text: event.currentTarget.value })} />
      <TextStyleFields
        value={selected}
        {fontOptions}
        sizeSuffix=""
        showAlign
        showHeading
        onchange={(patch) => onupdate(patch)}
      />
    {:else if selected.type === 'shape'}
      <ShapeFields value={selected} onchange={(patch) => onupdate(patch)} />
    {:else if selected.type === 'image' || selected.type === 'drawing'}
      <MediaFitFields
        value={selected.fit}
        onchange={(value) => onupdate({ fit: value })}
        drawing={selected.type === 'drawing' && Boolean(selected.drawingId)}
        onedit={oneditdrawing}
      />
    {/if}
  </Section>
{/if}

<Section label={t('composition.layers')}>
  <LayersList elements={orderedChildren.map((item) => item.child)} presorted selectedIds={selectedId ? [selectedId] : []} onselect={onselect} onreorder={onreorder} onupdate={onupdatechild} labelFor={labelFor} canRename={false} emptyText={t('composition.noLayers')} />
</Section>

<Section label={t('button.add')}>
  <div class="grid-2">
    <Button size="sm" variant="secondary" onclick={() => onaddbasic('text')}><Icon name="text" size={12} />{t('button.text')}</Button>
    <Button size="sm" variant="secondary" onclick={() => onaddbasic('shape')}><Icon name="shape" size={12} />{t('button.shape')}</Button>
  </div>
  <div class="asset-add">
    <Select label={t('button.media')} value={chosenMedia} options={mediaOptions} onchange={(value) => (chosenMedia = value)} />
    <Button size="sm" variant="ghost" onclick={onaddmedia}><Icon name="image" size={12} />{t('button.addMedia')}</Button>
  </div>
  <Button size="sm" variant="secondary" onclick={onnewdrawing}>
    <Icon name="pencil" size={12} />{t('button.drawNew')}
  </Button>
</Section>

<style>
  .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-1); }
  .asset-add { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: var(--space-1); }
  .state-copy { display: flex; flex-wrap: wrap; gap: var(--space-1); }
  .state-copy :global(.btn) { flex: 1 1 100px; }
  .current-state { font-family: var(--font-ui); font-size: var(--text-sm); }
  .hint { margin: var(--space-2) 0 0; max-width: 520px; color: var(--muted); font-size: var(--text-2xs); line-height: 1.4; }
</style>
