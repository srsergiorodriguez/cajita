<script>
  import Field from '../ui/Field.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
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
<Field
  label={t('shape.fill')}
  type="color"
  value={value.fill}
  oninput={(event) => patch({ fill: event.currentTarget.value })}
/>
<Field
  label={t('shape.stroke')}
  type="color"
  value={value.stroke}
  oninput={(event) => patch({ stroke: event.currentTarget.value })}
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
  <Field
    label={t('shape.radius')}
    type="number"
    value={value.radius ?? 0}
    min="0"
    max="50"
    suffix="%"
    oninput={(event) => patch({ radius: Number(event.currentTarget.value) })}
  />
{/if}
