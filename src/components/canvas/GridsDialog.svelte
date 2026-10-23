<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Icon from '../ui/Icon.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import { gridCells } from '../../lib/domain/grid.js';
  import {
    activePage,
    assignPageGrid,
    createGrid,
    deleteGrid,
    mergeGrid,
    session,
    unmergeGrid,
    updateGrid
  } from '../../lib/state/project.svelte.js';

  let { open = $bindable(false) } = $props();
  let selectedId = $state('');
  let cellStart = $state(null);
  let cellEnd = $state(null);

  const grids = $derived(Object.values(session.project?.grids ?? {}));
  const grid = $derived(grids.find((item) => item.id === selectedId) ?? grids[0] ?? null);
  const page = $derived(activePage());
  const layout = $derived(grid ? gridCells(grid, session.project.stage) : null);
  const selection = $derived.by(() => {
    if (!cellStart || !cellEnd) return null;
    const x = Math.min(cellStart.x, cellEnd.x);
    const y = Math.min(cellStart.y, cellEnd.y);
    return {
      x,
      y,
      w: Math.max(cellStart.w, Math.abs(cellStart.x - cellEnd.x) + 1, cellStart.w),
      h: Math.max(cellStart.h, Math.abs(cellStart.y - cellEnd.y) + 1, cellStart.h)
    };
  });

  $effect(() => {
    if (open && !selectedId) selectedId = grids[0]?.id ?? '';
  });

  function create() {
    try {
      const next = createGrid();
      selectedId = next.id;
      cellStart = null;
      cellEnd = null;
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function remove() {
    if (!grid || !window.confirm(t('grid.deleteConfirm', { name: grid.name }))) return;
    try {
      deleteGrid(grid.id);
      selectedId = grids.find((item) => item.id !== grid.id)?.id ?? '';
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function patch(key, value) {
    if (!grid) return;
    try {
      updateGrid(grid.id, { [key]: value }, { coalesceKey: `grid:${grid.id}:${key}` });
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function chooseCell(event) {
    if (!layout) return;
    const svg = event.currentTarget.querySelector('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * session.project.stage.width;
    const y = ((event.clientY - rect.top) / rect.height) * session.project.stage.height;
    const cell = layout.cells.find(
      (item) => x >= item.px && x <= item.px + item.pw && y >= item.py && y <= item.py + item.ph
    );
    if (!cell) return;
    if (event.shiftKey && cellStart) cellEnd = { x: cell.x, y: cell.y };
    else {
      cellStart = { x: cell.x, y: cell.y, w: cell.w, h: cell.h };
      cellEnd = { x: cell.x, y: cell.y };
    }
  }

  function merge() {
    if (!grid || !selection) return;
    try {
      mergeGrid(grid.id, selection);
      cellStart = null;
      cellEnd = null;
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function unmerge() {
    if (!grid || !selection) return;
    try {
      unmergeGrid(grid.id, selection);
      cellStart = null;
      cellEnd = null;
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function useOnPage() {
    if (!grid || !page) return;
    try {
      assignPageGrid(page.id, grid.id);
      toast(t('grid.assigned'), 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }
</script>

<Dialog bind:open title={t('grid.manager')} wide>
  <div class="grid-manager">
    <aside class="grid-list">
      <div class="list-head">
        <span class="mono-label">{t('grid.list')}</span>
        <Button size="sm" variant="ghost" onclick={create}>
          <Icon name="plus" size={12} />{t('grid.new')}
        </Button>
      </div>
      {#if grids.length === 0}
        <p class="hint">{t('grid.empty')}</p>
      {:else}
        {#each grids as item (item.id)}
          <button
            type="button"
            class="grid-row"
            class:active={item.id === grid?.id}
            onclick={() => {
              selectedId = item.id;
              cellStart = null;
              cellEnd = null;
            }}
          >
            <span>{item.name}</span>
            {#if page?.gridId === item.id}<small>{t('grid.onPage')}</small>{/if}
          </button>
        {/each}
      {/if}
    </aside>

    <section class="grid-editor">
      {#if grid && layout}
        <div class="grid-fields">
          <Field
            label={t('grid.name')}
            value={grid.name}
            oninput={(event) => patch('name', event.currentTarget.value)}
          />
          <Field
            label={t('grid.cellSize')}
            type="number"
            min="24"
            max="800"
            suffix="px"
            value={grid.cellSize}
            oninput={(event) => patch('cellSize', Number(event.currentTarget.value))}
          />
          <Field
            label={t('grid.margin')}
            type="number"
            min="0"
            max="25"
            step="0.5"
            suffix="%"
            value={grid.marginPercent}
            oninput={(event) => patch('marginPercent', Number(event.currentTarget.value))}
          />
        </div>
        <p class="hint">{t('grid.hint')}</p>
        <button
          type="button"
          class="grid-preview"
          onclick={chooseCell}
          aria-label={t('grid.selectCells')}
          style={`aspect-ratio:${session.project.stage.width}/${session.project.stage.height}`}
        >
          <svg
            viewBox={`0 0 ${session.project.stage.width} ${session.project.stage.height}`}
            preserveAspectRatio="none"
          >
            <rect
              x={layout.geometry.x}
              y={layout.geometry.y}
              width={layout.geometry.width}
              height={layout.geometry.height}
              class="margin"
            />
            {#each layout.cells as cell (cell.x + ':' + cell.y)}
              <rect
                x={cell.px}
                y={cell.py}
                width={cell.pw}
                height={cell.ph}
                class="cell"
              />
            {/each}
            {#if selection}
              <rect
                x={layout.geometry.x + selection.x * grid.cellSize}
                y={layout.geometry.y + selection.y * grid.cellSize}
                width={selection.w * grid.cellSize}
                height={selection.h * grid.cellSize}
                class="selection"
              />
            {/if}
          </svg>
        </button>
        <div class="grid-actions">
          <Button size="sm" variant="ghost" onclick={unmerge} disabled={!selection}>
            {t('grid.unmerge')}
          </Button>
          <Button size="sm" variant="secondary" onclick={merge} disabled={!selection}>
            {t('grid.merge')}
          </Button>
          <Button size="sm" variant="accent" onclick={useOnPage} disabled={!page}>
            {t('grid.useOnPage')}
          </Button>
          <Button size="sm" variant="danger" onclick={remove}>
            {t('grid.delete')}
          </Button>
        </div>
      {:else}
        <p class="hint">{t('grid.empty')}</p>
      {/if}
    </section>
  </div>
</Dialog>

<style>
  .grid-manager {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr);
    gap: var(--space-4);
    min-height: 420px;
  }
  .grid-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-right: 1px solid var(--line-soft);
    padding-right: var(--space-3);
  }
  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  .grid-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    text-align: left;
    cursor: pointer;
  }
  .grid-row:hover {
    background: var(--panel-3);
  }
  .grid-row.active {
    border-color: var(--selection);
  }
  .grid-row small {
    color: var(--muted);
    font-size: var(--text-3xs);
  }
  .grid-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }
  .grid-fields {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr;
    gap: var(--space-2);
  }
  .grid-preview {
    display: block;
    width: 100%;
    max-height: 48vh;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    background: var(--panel-2);
    cursor: crosshair;
  }
  .grid-preview svg {
    display: block;
    width: 100%;
    max-height: 48vh;
    cursor: crosshair;
  }
  .margin {
    fill: none;
    stroke: var(--selection);
    stroke-width: 2;
    stroke-dasharray: 8 5;
  }
  .cell {
    fill: none;
    stroke: var(--line);
    stroke-width: 1;
  }
  .selection {
    fill: color-mix(in srgb, var(--selection) 22%, transparent);
    stroke: var(--selection);
    stroke-width: 2;
  }
  .grid-actions {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
  @media (max-width: 700px) {
    .grid-manager {
      grid-template-columns: 1fr;
    }
    .grid-list {
      border-right: 0;
      border-bottom: 1px solid var(--line-soft);
      padding: 0 0 var(--space-2);
    }
  }
</style>
