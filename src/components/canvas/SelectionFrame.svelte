<script>
  import { t } from '../../lib/i18n/index.svelte.js';

  let { style = '', locked = false, onresize = null, onrotate = null, handleScale = 1 } = $props();
  const handleVars = $derived.by(() => {
    const scale = Number(handleScale) > 0 ? Number(handleScale) : 1;
    return [
      `--handle-size:${9 / scale}px`,
      `--handle-offset:${-5 / scale}px`,
      `--handle-offset-half:${-4 / scale}px`,
      `--handle-border:${2 / scale}px`,
      `--rotate-line-top:${-26 / scale}px`,
      `--rotate-line-height:${24 / scale}px`,
      `--rotate-line-width:${1 / scale}px`,
      `--rotate-handle-top:${-34 / scale}px`,
      `--rotate-handle-size:${12 / scale}px`,
      `--rotate-handle-margin:${-6 / scale}px`
    ].join(';');
  });

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

<div class="selection" class:locked style={`${style};${handleVars}`}>
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
    border: var(--handle-border, 2px) solid var(--selection);
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
    width: var(--handle-size, 9px);
    height: var(--handle-size, 9px);
    border: var(--handle-border, 2px) solid var(--line);
    background: var(--panel-2);
    pointer-events: auto;
  }

  .h-nw {
    left: var(--handle-offset, -5px);
    top: var(--handle-offset, -5px);
    cursor: nwse-resize;
  }
  .h-n {
    left: 50%;
    top: var(--handle-offset, -5px);
    margin-left: var(--handle-offset-half, -4px);
    cursor: ns-resize;
  }
  .h-ne {
    right: var(--handle-offset, -5px);
    top: var(--handle-offset, -5px);
    cursor: nesw-resize;
  }
  .h-e {
    right: var(--handle-offset, -5px);
    top: 50%;
    margin-top: var(--handle-offset-half, -4px);
    cursor: ew-resize;
  }
  .h-se {
    right: var(--handle-offset, -5px);
    bottom: var(--handle-offset, -5px);
    cursor: nwse-resize;
  }
  .h-s {
    left: 50%;
    bottom: var(--handle-offset, -5px);
    margin-left: var(--handle-offset-half, -4px);
    cursor: ns-resize;
  }
  .h-sw {
    left: var(--handle-offset, -5px);
    bottom: var(--handle-offset, -5px);
    cursor: nesw-resize;
  }
  .h-w {
    left: var(--handle-offset, -5px);
    top: 50%;
    margin-top: var(--handle-offset-half, -4px);
    cursor: ew-resize;
  }

  .rotate-line {
    position: absolute;
    left: 50%;
    top: var(--rotate-line-top, -26px);
    width: var(--rotate-line-width, 1px);
    height: var(--rotate-line-height, 24px);
    background: var(--selection);
    pointer-events: none;
  }

  .rotate-handle {
    position: absolute;
    left: 50%;
    top: var(--rotate-handle-top, -34px);
    width: var(--rotate-handle-size, 12px);
    height: var(--rotate-handle-size, 12px);
    margin-left: var(--rotate-handle-margin, -6px);
    padding: 0;
    border: var(--handle-border, 2px) solid var(--line);
    border-radius: 50%;
    background: var(--accent);
    pointer-events: auto;
    cursor: grab;
  }
</style>
