<script>
  import Field from '../ui/Field.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import Select from '../ui/Select.svelte';
  import ColorField from './ColorField.svelte';
  import { session } from '../../lib/state/project.svelte.js';
  import { radiusTokenValue } from '../../lib/domain/design.js';
  import { t } from '../../lib/i18n/index.svelte.js';

  let { value = {}, onchange = null } = $props();

  const patch = (next) => onchange?.(next);
</script>

<SegmentedControl
  label={t('shape.kind')}
  value={value.shape}
  options={[
    { value: 'circle', label: t('shape.circle') },
    { value: 'square', label: t('shape.square') },
    { value: 'triangle', label: t('shape.triangle') }
  ]}
  onchange={(shape) => patch({ shape })}
/>
<ColorField
  label={t('shape.fill')}
  value={value.fill}
  token={value.fillToken}
  project={session.project}
  onchange={({ value: color, token, index }) => patch({ fill: color, fillToken: token, fillIndex: index })}
/>
<ColorField
  label={t('shape.stroke')}
  value={value.stroke}
  token={value.strokeToken}
  project={session.project}
  onchange={({ value: color, token, index }) => patch({ stroke: color, strokeToken: token, strokeIndex: index })}
/>
<Field
  label={t('shape.strokeWidth')}
  type="number"
  value={value.strokeWidth}
  min="0"
  max="40"
  oninput={(event) => patch({ strokeWidth: Number(event.currentTarget.value) })}
/>
{#if value.shape !== 'circle'}
  <Select
    label={t('shape.radiusToken')}
    value={value.radiusToken ?? ''}
    options={[
      { value: '', label: t('design.colorCustom') },
      ...(session.project?.radiusTokens ?? []).map((item) => ({ value: item.id, label: item.name }))
    ]}
    onchange={(token) => {
      if (!token) patch({ radiusToken: null });
      else patch({ radiusToken: token, radius: radiusTokenValue(session.project, token, value.radius ?? 0) });
    }}
  />
  <Field
    label={t('shape.radius')}
    type="number"
    value={value.radius ?? 0}
    min="0"
    max="50"
    suffix="%"
    oninput={(event) => patch({ radius: Number(event.currentTarget.value), radiusToken: null })}
  />
{/if}
