<script>
  import { t } from '../../lib/i18n/index.svelte.js';
  import { colorForToken, colorTokenIndex } from '../../lib/domain/design.js';

  let { label = '', value = '#1c1917', token = null, project = null, onchange = null } = $props();

  const options = $derived([
    { value: '', label: t('design.colorCustom') },
    ...(project?.colorTokens ?? []).map((item) => ({ value: item.id, label: item.name }))
  ]);

  function chooseToken(next) {
    if (!next) {
      onchange?.({ value, token: null, index: null });
      return;
    }
    const index = colorTokenIndex(project, next);
    onchange?.({
      value: colorForToken(project, next, value),
      token: next,
      index
    });
  }

  function chooseColor(event) {
    onchange?.({ value: event.currentTarget.value, token: null, index: null });
  }
</script>

<div class="color-field">
  <span class="label">{label}</span>
  <div class="row">
    <select value={token ?? ''} aria-label={label} onchange={(event) => chooseToken(event.currentTarget.value)}>
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <input type="color" value={value} aria-label={label} oninput={chooseColor} />
  </div>
</div>

<style>
  .color-field { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
  .label { color: var(--muted); font-size: var(--label-param-size); }
  .row { display: grid; grid-template-columns: minmax(0, 1fr) 30px; gap: var(--space-1); }
  select { min-width: 0; height: 28px; padding: 0 5px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font: inherit; }
  input { width: 30px; height: 28px; padding: 2px; border: 1px solid var(--line); background: var(--panel-2); }
</style>
