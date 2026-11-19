<script>
  import Field from '../ui/Field.svelte';
  import Select from '../ui/Select.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import ColorField from './ColorField.svelte';
  import { session } from '../../lib/state/project.svelte.js';
  import { t } from '../../lib/i18n/index.svelte.js';

  let {
    value = {},
    fontOptions = [],
    sizeSuffix = 'px',
    showAlign = false,
    showHeading = false,
    styleOptions = null,
    textStyleId = '',
    onstyle = null,
    onchange = null
  } = $props();

  const patch = (next) => onchange?.(next);
</script>

<div class="text-fields">
  {#if styleOptions}
    <Select label={t('text.style')} value={textStyleId} options={styleOptions} onchange={(value) => onstyle?.(value)} />
  {/if}
  <Select
    label={t('text.font')}
    value={value.font}
    {fontOptions}
    options={fontOptions}
    onchange={(font) => patch({ font })}
  />
  <div class="text-row" class:with-align={showAlign}>
    <Field
      label={t('text.size')}
      type="number"
      value={value.fontSize}
      suffix={sizeSuffix}
      oninput={(event) => patch({ fontSize: Number(event.currentTarget.value) })}
    />
    {#if showAlign}
      <div class="align-control">
        <span class="param-label">{t('text.align')}</span>
        <SegmentedControl
          label={t('text.align')}
          value={value.align}
          options={[
            { value: 'left', label: t('text.left'), icon: 'align-left' },
            { value: 'center', label: t('text.center'), icon: 'align-center' },
            { value: 'right', label: t('text.right'), icon: 'align-right' },
            { value: 'justify', label: t('text.justify'), icon: 'align-justify' }
          ]}
          onchange={(align) => patch({ align })}
        />
      </div>
    {/if}
  </div>
  <ColorField
    label={t('text.color')}
    value={value.color}
    token={value.colorToken}
    project={session.project}
    onchange={({ value: color, token, index }) => patch({ color, colorToken: token, colorIndex: index })}
  />
  {#if showHeading}
    <label class="check">
      <input
        type="checkbox"
        checked={Boolean(value.heading)}
        onchange={(event) => patch({ heading: event.currentTarget.checked })}
      />
      <span>{t('text.heading')}</span>
    </label>
  {/if}
</div>

<style>
  .text-fields { display: flex; flex-direction: column; gap: var(--space-2); }
  .text-row { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-2); align-items: end; }
  .text-row.with-align { grid-template-columns: minmax(0, 1fr) auto; }
  .align-control { display: flex; flex-direction: column; gap: var(--space-1); }
  .param-label { color: var(--muted); font-size: var(--text-2xs); }
</style>
