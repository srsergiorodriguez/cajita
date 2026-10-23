<script>
  let {
    label,
    options = [],
    value = $bindable(''),
    disabled = false,
    onchange
  } = $props();

  const id = $props.id();
</script>

<label class="field" for={id}>
  <span class="label">{label}</span>
  <select
    {id}
    bind:value
    {disabled}
    onchange={(event) => onchange?.(event.currentTarget.value)}
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .label {
    color: var(--muted);
    font-size: var(--text-2xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  select {
    min-height: 30px;
    padding: 0 6px;
    border: var(--border-control) solid var(--line);
    border-radius: 0;
    background: var(--panel-2);
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
  }

  select:disabled {
    color: var(--ink-2);
    opacity: 0.6;
  }
</style>
