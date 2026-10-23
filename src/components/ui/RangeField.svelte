<script>
  let {
    label,
    value = $bindable(1),
    min = 0.9,
    max = 1.3,
    step = 0.05,
    hint = '',
    oninput
  } = $props();

  const id = $props.id();
  const display = $derived(`${Math.round(value * 100)}%`);

  function handleInput(event) {
    value = Number(event.currentTarget.value);
    oninput?.(value);
  }
</script>

<label class="range-field" for={id}>
  <span class="range-head">
    <span class="label">{label}</span>
    <output for={id}>{display}</output>
  </span>
  <input
    {id}
    type="range"
    {min}
    {max}
    {step}
    {value}
    oninput={handleInput}
    aria-valuetext={display}
  />
  {#if hint}<span class="hint">{hint}</span>{/if}
</label>

<style>
  .range-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .range-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .label {
    color: var(--muted);
    font-size: var(--text-2xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  output {
    color: var(--ink);
    font-size: var(--text-2xs);
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.35;
  }
</style>
