<script>
  import Icon from './Icon.svelte';

  let { options = [], value = $bindable(), label, disabled = false, onchange } = $props();
</script>

<div class="segmented" role="group" aria-label={label}>
  {#each options as option}
    <button
      type="button"
      class:active={value === option.value}
      aria-pressed={value === option.value}
      aria-label={option.ariaLabel ?? option.label}
      title={option.ariaLabel ?? option.label}
      {disabled}
      onclick={() => {
        if (disabled) return;
        value = option.value;
        onchange?.(option.value);
      }}
    >
      {#if option.icon}
        <Icon name={option.icon} size={14} />
      {:else}
        {option.label}
      {/if}
    </button>
  {/each}
</div>

<style>
  .segmented {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    border: var(--border-control) solid var(--line);
    background: var(--panel-2);
  }

  button {
    min-height: 28px;
    padding: 0 7px;
    min-width: 28px;
    border: 0;
    border-right: 1px solid var(--line-soft);
    border-radius: 0;
    background: transparent;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    line-height: 1;
    text-transform: lowercase;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  button:last-child {
    border-right: 0;
  }

  button:hover:not(:disabled) {
    background: var(--panel-3);
    color: var(--ink);
  }

  button.active {
    background: var(--ink);
    color: var(--panel);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
