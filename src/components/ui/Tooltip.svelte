<script>
  let { label, children } = $props();
</script>

<span class="tip-wrap" data-tip={label}>
  {#if children}{@render children()}{/if}
</span>

<style>
  .tip-wrap {
    position: relative;
    display: inline-flex;
  }

  .tip-wrap::after {
    content: attr(data-tip);
    position: absolute;
    left: 50%;
    top: calc(100% + 6px);
    z-index: var(--z-toast);
    transform: translateX(-50%);
    padding: 3px 6px;
    background: var(--ink);
    color: var(--panel);
    font-size: var(--text-2xs);
    line-height: 1.3;
    white-space: nowrap;
    display: none;
    pointer-events: none;
  }

  .tip-wrap:hover::after,
  .tip-wrap:focus-within::after {
    display: block;
  }
</style>
