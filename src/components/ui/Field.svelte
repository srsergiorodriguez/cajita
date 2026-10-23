<script>
  let {
    label,
    value = $bindable(''),
    type = 'text',
    suffix = '',
    disabled = false,
    readonly = false,
    placeholder = '',
    hint = '',
    min,
    max,
    step,
    oninput,
    onchange
  } = $props();

  const fieldId = $props.id();
  const hintId = `${fieldId}-hint`;
</script>

<label class="field" for={fieldId}>
  <span class="label">{label}</span>
  <span class="control">
    <input
      id={fieldId}
      {type}
      bind:value
      {disabled}
      {readonly}
      {placeholder}
      {min}
      {max}
      {step}
      aria-describedby={hint ? hintId : undefined}
      {oninput}
      {onchange}
    />
    {#if suffix}<span class="suffix">{suffix}</span>{/if}
  </span>
  {#if hint}<span class="hint" id={hintId}>{hint}</span>{/if}
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .label {
    color: var(--muted);
    font-size: var(--label-param-size);
    font-weight: 400;
    letter-spacing: var(--label-param-tracking);
    text-transform: none;
  }

  .control {
    display: flex;
    align-items: center;
    min-height: 30px;
    border: var(--border-control) solid var(--line);
    background: var(--panel-2);
  }

  input {
    width: 100%;
    min-width: 0;
    height: 28px;
    padding: 0 6px;
    border: 0;
    background: transparent;
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    outline: none;
  }

  input:disabled,
  input:read-only {
    color: var(--ink-2);
    cursor: default;
  }

  input::placeholder {
    color: var(--muted);
  }

  .suffix {
    padding: 0 5px;
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .control:focus-within {
    outline: var(--focus-ring-width) solid var(--focus);
    outline-offset: 0;
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.35;
  }
</style>
