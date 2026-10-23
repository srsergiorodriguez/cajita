<script>
  import Icon from './Icon.svelte';

  let {
    label,
    icon,
    onclick,
    disabled = false,
    variant = 'default',
    size = 32,
    iconSize = 16,
    tipPosition = 'bottom'
  } = $props();

  const sizeClass = $derived(
    size === 24 ? 'icon-btn--24' : size === 26 ? 'icon-btn--26' : 'icon-btn--32'
  );
</script>

<button
  class="icon-btn icon-btn--{variant} {sizeClass}"
  type="button"
  aria-label={label}
  {disabled}
  {onclick}
>
  <Icon name={icon} size={iconSize} />
  <span class="tip tip--{tipPosition}" role="tooltip">{label}</span>
</button>

<style>
  .icon-btn {
    position: relative;
    display: inline-grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: var(--border-control) solid var(--line);
    border-radius: 0;
    background: var(--panel-2);
    color: var(--ink);
    box-shadow: var(--shadow-btn);
    transition:
      transform var(--motion-fast) var(--ease-out),
      background var(--motion-fast) var(--ease-out);
  }

  .icon-btn:hover:not(:disabled) {
    background: var(--panel-3);
    transform: translate(-1px, -1px);
  }

  .icon-btn:disabled {
    border-style: dotted;
    box-shadow: none;
    opacity: 0.45;
  }

  .icon-btn--ghost {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
  }

  .icon-btn--ghost:hover:not(:disabled) {
    background: var(--panel-3);
    transform: none;
  }

  .icon-btn--24 {
    width: 24px;
    height: 24px;
  }

  .icon-btn--26 {
    width: 26px;
    height: 26px;
  }

  .icon-btn--32 {
    width: 32px;
    height: 32px;
  }

  .icon-btn--bare {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    color: var(--muted);
  }

  .icon-btn--bare:hover:not(:disabled) {
    background: var(--panel-3);
    color: var(--ink);
    transform: none;
  }

  .tip {
    display: none;
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    z-index: var(--z-toast);
    transform: translateX(-50%);
    padding: 3px 6px;
    border-radius: 0;
    background: var(--ink);
    color: var(--panel);
    font-size: var(--text-2xs);
    line-height: 1.3;
    white-space: nowrap;
    pointer-events: none;
  }

  .tip--top {
    top: auto;
    bottom: calc(100% + 6px);
  }

  .icon-btn:hover .tip,
  .icon-btn:focus-visible .tip {
    display: block;
  }
</style>
