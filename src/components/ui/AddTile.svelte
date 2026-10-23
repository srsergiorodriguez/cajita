<script>
  let {
    label,
    title = label,
    onclick,
    disabled = false,
    width = '58px',
    height = '58px'
  } = $props();
</script>

<button
  type="button"
  class="add-tile"
  style:width
  style:height
  {title}
  aria-label={label}
  {disabled}
  {onclick}
>
  ＋
</button>

<style>
  .add-tile {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    padding: 0;
    border: 2px dashed var(--line);
    border-radius: 0;
    background: transparent;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-xl);
    line-height: 1;
    cursor: pointer;
  }

  .add-tile:hover:not(:disabled) {
    border-color: var(--ink-2);
    color: var(--ink);
  }

  .add-tile:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
</style>
