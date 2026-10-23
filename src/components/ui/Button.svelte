<script>
  let {
    variant = 'secondary',
    size = 'md',
    type = 'button',
    disabled = false,
    title,
    onclick,
    children
  } = $props();
</script>

<button class="btn btn--{variant} btn--{size}" {type} {disabled} {title} {onclick}>
  {#if children}{@render children()}{/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 32px;
    padding: 0 10px;
    border: var(--border-control) solid var(--line);
    border-radius: 0;
    background: var(--panel-2);
    color: var(--ink);
    box-shadow: var(--shadow-btn);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    font-weight: 700;
    line-height: 1;
    text-transform: lowercase;
    white-space: nowrap;
    transition:
      transform var(--motion-fast) var(--ease-out),
      box-shadow var(--motion-fast) var(--ease-out),
      background var(--motion-fast) var(--ease-out);
  }

  .btn:hover:not(:disabled) {
    background: var(--panel-3);
    transform: translate(-1px, -1px);
  }

  .btn:active:not(:disabled) {
    transform: translate(0, 0);
    box-shadow: none;
  }

  .btn:disabled {
    border-style: dotted;
    box-shadow: none;
    opacity: 0.45;
  }

  .btn--primary {
    background: var(--ink);
    color: var(--panel);
  }

  .btn--primary:hover:not(:disabled) {
    background: var(--ink-2);
  }

  .btn--accent {
    background: var(--accent);
    color: var(--accent-ink);
  }

  .btn--accent:hover:not(:disabled) {
    background: var(--accent);
    filter: brightness(0.96);
  }

  .btn--ghost {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
  }

  .btn--ghost:hover:not(:disabled) {
    background: var(--panel-3);
    transform: none;
  }

  .btn--danger {
    border-color: var(--danger);
    background: transparent;
    color: var(--danger);
    box-shadow: none;
  }

  .btn--danger:hover:not(:disabled) {
    background: var(--danger);
    color: var(--panel-2);
  }

  .btn--sm {
    min-height: 26px;
    padding: 0 7px;
    font-size: var(--text-2xs);
  }

  .btn--lg {
    min-height: 40px;
    padding: 0 14px;
    font-size: var(--text-sm);
  }
</style>
