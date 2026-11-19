<script>
  import Field from '../ui/Field.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import ColorField from './ColorField.svelte';
  import RadiusField from './RadiusField.svelte';
  import { session } from '../../lib/state/project.svelte.js';
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
  <RadiusField
    value={value.radius ?? 0}
    token={value.radiusToken}
    project={session.project}
    onchange={({ value: radius, token }) => patch({ radius, radiusToken: token })}
  />
{/if}
