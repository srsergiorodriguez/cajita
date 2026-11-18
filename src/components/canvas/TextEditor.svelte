<script>
  import { t } from '../../lib/i18n/index.svelte.js';

  const selection = $derived(
    String(background).toLowerCase().includes('171b21')
      ? { background: '#f6f0e4', color: '#171b21' }
      : { background: '#1c1917', color: '#fffdf7' }
  );

  let {
    value = $bindable(''),
    style = '',
    background = 'var(--stage)',
    caretColor = 'currentColor',
    textarea = $bindable(null),
    oncommit = null,
    onkeydown = null
  } = $props();
</script>

<textarea
  class="text-edit"
  bind:this={textarea}
  bind:value
  style={`${style};background:${background};caret-color:${caretColor};--text-selection-bg:${selection.background};--text-selection-ink:${selection.color}`}
  onpointerdown={(event) => event.stopPropagation()}
  onkeydown={(event) => onkeydown?.(event)}
  onblur={() => oncommit?.()}
  aria-label={t('canvas.editText')}
></textarea>

<style>
  .text-edit::selection {
    background: var(--text-selection-bg);
    color: var(--text-selection-ink);
  }

  .text-edit {
    position: absolute;
    left: var(--x, 0);
    top: var(--y, 0);
    width: var(--w, auto);
    height: var(--h, auto);
    transform: rotate(var(--rot, 0deg));
    z-index: 200;
    margin: 0;
    border: 2px solid var(--selection);
    outline: none;
    resize: none;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: inherit;
  }
</style>
