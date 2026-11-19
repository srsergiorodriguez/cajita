<script>
  import { t } from '../../lib/i18n/index.svelte.js';
  import { radiusTokenValue } from '../../lib/domain/design.js';

  let { value = 0, token = null, project = null, onchange = null } = $props();

  const options = $derived([
    { value: '', label: t('design.colorCustom') },
    ...(project?.radiusTokens ?? []).map((item) => ({ value: item.id, label: item.name }))
  ]);

  function chooseToken(next) {
    if (!next) {
      onchange?.({ value, token: null });
      return;
    }
    onchange?.({
      value: radiusTokenValue(project, next, value),
      token: next
    });
  }

  function chooseValue(event) {
    onchange?.({ value: Number(event.currentTarget.value), token: null });
  }
</script>

<div class="radius-field">
  <span class="label">{t('shape.radius')}</span>
  <div class="row">
    <select value={token ?? ''} aria-label={t('shape.radiusToken')} onchange={(event) => chooseToken(event.currentTarget.value)}>
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <label class="number">
      <input type="number" min="0" max="50" value={value} aria-label={t('shape.radius')} oninput={chooseValue} />
      <span>%</span>
    </label>
  </div>
</div>

<style>
  .radius-field { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
  .label { color: var(--muted); font-size: var(--label-param-size); }
  .row { display: grid; grid-template-columns: minmax(0, 1fr) 64px; gap: var(--space-1); }
  select { min-width: 0; height: 28px; padding: 0 5px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font: inherit; }
  .number { position: relative; display: flex; align-items: center; }
  .number input { width: 100%; height: 28px; padding: 0 18px 0 5px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font: inherit; text-align: right; }
  .number span { position: absolute; right: 5px; color: var(--muted); font-family: var(--font-mono); font-size: 9px; pointer-events: none; }
</style>
