<script>
  import { t } from '../../lib/i18n/index.svelte.js';

  let { style = '', locked = false, onresize = null, onrotate = null } = $props();

  const handles = [
    ['nw', 'h-nw'],
    ['n', 'h-n'],
    ['ne', 'h-ne'],
    ['e', 'h-e'],
    ['se', 'h-se'],
    ['s', 'h-s'],
    ['sw', 'h-sw'],
    ['w', 'h-w']
  ];
</script>

<div class="selection" class:locked {style}>
  {#each handles as [handle, className] (handle)}
    <button
      type="button"
      class="handle {className}"
      aria-label={t('canvas.resize')}
      onpointerdown={(event) => onresize?.(event, handle)}
    ></button>
  {/each}
  <span class="rotate-line"></span>
  <button
    type="button"
    class="rotate-handle"
    aria-label={t('canvas.rotate')}
    onpointerdown={(event) => onrotate?.(event)}
  ></button>
</div>

<style>
  .selection {
    position: absolute;
    z-index: 100;
    left: var(--x, 0);
    top: var(--y, 0);
    width: var(--w, 0);
    height: var(--h, 0);
    transform: rotate(var(--rot, 0deg));
    border: 2px solid var(--selection);
    pointer-events: none;
  }

  .selection.locked .handle,
  .selection.locked .rotate-handle,
  .selection.locked .rotate-line {
    display: none;
  }

  .handle {
    position: absolute;
    padding: 0;
    width: 9px;
    height: 9px;
    border: 2px solid var(--line);
    background: var(--panel-2);
    pointer-events: auto;
  }

  .h-nw {
    left: -5px;
    top: -5px;
    cursor: nwse-resize;
  }
  .h-n {
    left: 50%;
    top: -5px;
    margin-left: -4px;
    cursor: ns-resize;
  }
  .h-ne {
    right: -5px;
    top: -5px;
    cursor: nesw-resize;
  }
  .h-e {
    right: -5px;
    top: 50%;
    margin-top: -4px;
    cursor: ew-resize;
  }
  .h-se {
    right: -5px;
    bottom: -5px;
    cursor: nwse-resize;
  }
  .h-s {
    left: 50%;
    bottom: -5px;
    margin-left: -4px;
    cursor: ns-resize;
  }
  .h-sw {
    left: -5px;
    bottom: -5px;
    cursor: nesw-resize;
  }
  .h-w {
    left: -5px;
    top: 50%;
    margin-top: -4px;
    cursor: ew-resize;
  }

  .rotate-line {
    position: absolute;
    left: 50%;
    top: -26px;
    width: 1px;
    height: 24px;
    background: var(--selection);
    pointer-events: none;
  }

  .rotate-handle {
    position: absolute;
    left: 50%;
    top: -34px;
    width: 12px;
    height: 12px;
    margin-left: -6px;
    padding: 0;
    border: 2px solid var(--line);
    border-radius: 50%;
    background: var(--accent);
    pointer-events: auto;
    cursor: grab;
  }
</style>
