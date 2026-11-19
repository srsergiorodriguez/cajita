<script>
  import IconButton from '../ui/IconButton.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';

  let {
    zoom,
    onZoomOut,
    onZoomIn,
    onFitWidth,
    onFitPage = null,
    fitWidthActive = false,
    fitPageActive = false,
    viewport = null,
    viewportOptions = [],
    onviewport = null,
    onActualSize = null,
    actualSizeActive = false
  } = $props();
</script>

<div class="zoom-controls">
  {#if viewport && viewportOptions.length > 1}
    <select
      class="viewport-select"
      value={String(viewport)}
      aria-label={t('canvas.viewport')}
      title={t('canvas.viewport')}
      onchange={(event) => onviewport?.(Number(event.currentTarget.value))}
    >
      {#each viewportOptions as option}
        <option value={String(option)}>{option}px</option>
      {/each}
    </select>
  {/if}
  <IconButton
    label={t('canvas.zoomOut')}
    icon="minus"
    size={24}
    iconSize={12}
    variant="ghost"
    onclick={onZoomOut}
  />
  <span class="zoom-value" aria-live="polite">{Math.round(zoom * 100)}%</span>
  <IconButton
    label={t('canvas.zoomIn')}
    icon="plus"
    size={24}
    iconSize={12}
    variant="ghost"
    onclick={onZoomIn}
  />
  {#if onActualSize}
    <button
      type="button"
      class="fit-button"
      class:active={actualSizeActive}
      aria-label={t('canvas.actualSize')}
      title={t('canvas.actualSize')}
      onclick={onActualSize}
    >
      100%
    </button>
  {/if}
  {#if onFitPage}
    <button
      type="button"
      class="fit-button"
      class:active={fitPageActive}
      aria-label={t('canvas.fitPage')}
      title={t('canvas.fitPage')}
      onclick={onFitPage}
    >
      {t('canvas.fitPage')}
    </button>
  {/if}
  <button
    type="button"
    class="fit-button"
    class:active={fitWidthActive}
    aria-label={t('canvas.fitWidth')}
    title={t('canvas.fitWidth')}
    onclick={onFitWidth}
  >
    {t('canvas.fitWidth')}
  </button>
</div>

<style>
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
  }

  .viewport-select {
    height: 24px;
    max-width: 78px;
    padding: 0 3px;
    border: 1px solid var(--line-soft);
    background: var(--panel-2);
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: var(--text-3xs);
  }

  .zoom-value {
    min-width: 42px;
    color: var(--ink-2);
    font-size: var(--text-2xs);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .fit-button {
    height: 24px;
    padding: 0 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-3xs);
    text-transform: lowercase;
    white-space: nowrap;
  }

  .fit-button:hover,
  .fit-button.active {
    border-color: var(--line);
    color: var(--ink);
  }
</style>
