<script>
  import { appState } from '$stores/appState.svelte.js';

  // Imports for the Shoelace components
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/icon/icon.js';
  import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
  import '@shoelace-style/shoelace/dist/components/divider/divider.js';

  // Accept zoom controls from the parent view
  let { zoomLevel, zoomIn, zoomOut, resetZoom, fitToScreen } = $props();
</script>

<div class="toolbar">
  <div class="tool-group">
    <sl-tooltip content="Select Single Cell" placement="bottom">
      <sl-button size="small" variant={appState.selectionMode === 'single' ? 'primary' : 'default'} onclick={() => appState.selectionMode = 'single'}>
        <sl-icon name="hand-index"></sl-icon>
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Select Area" placement="bottom">
      <sl-button size="small" variant={appState.selectionMode === 'multiple' ? 'primary' : 'default'} onclick={() => appState.selectionMode = 'multiple'}>
        <sl-icon name="grid-3x2"></sl-icon>
      </sl-button>
    </sl-tooltip>
  </div>

  <sl-divider vertical></sl-divider>

  <div class="tool-group">
    <sl-tooltip content="Merge to Macro-Cell (Select a perfect square)" placement="bottom">
      <sl-button size="small" disabled={!appState.canMergeSelection().valid} onclick={() => appState.mergeSelectedCells()}>
        <sl-icon name="aspect-ratio"></sl-icon>
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Unmerge" placement="bottom">
      <sl-button size="small" disabled={appState.selectedCells.length === 0 || appState.getCellStatus(appState.selectedCells[0]).role === 'standard'} onclick={() => appState.unmergeSelectedCells()}>
        <sl-icon name="grid"></sl-icon>
      </sl-button>
    </sl-tooltip>
  </div>

  <sl-divider vertical></sl-divider>

  <div class="tool-group">
    <sl-tooltip content="Copy Cell" placement="bottom">
      <sl-button size="small" disabled={appState.selectedCells.length === 0} onclick={() => appState.copySelectedCell()}>
        <sl-icon name="clipboard2"></sl-icon>
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Paste Mark" placement="bottom">
      <sl-button size="small" disabled={appState.selectedCells.length === 0 || appState.copiedBlock === null} onclick={() => appState.pasteToSelectedCell('mark')}>
        <sl-icon name="clipboard2-heart"></sl-icon>
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Paste Text" placement="bottom">
      <sl-button size="small" disabled={appState.selectedCells.length === 0 || appState.copiedBlock === null} onclick={() => appState.pasteToSelectedCell('text')}>
        <sl-icon name="type"></sl-icon>
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Paste Entire Cell" placement="bottom">
      <sl-button size="small" disabled={appState.selectedCells.length === 0 || appState.copiedBlock === null} onclick={() => appState.pasteToSelectedCell('all')}>
        <sl-icon name="clipboard2-plus"></sl-icon>
      </sl-button>
    </sl-tooltip>
  </div>

  <sl-divider vertical></sl-divider>

  <div class="tool-group">
    <sl-tooltip content="Clear Marks" placement="bottom">
      <sl-button size="small" disabled={appState.selectedCells.length === 0} onclick={() => appState.clearSelectedCells()}>
        <sl-icon name="eraser"></sl-icon>
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Clear Text" placement="bottom">
      <sl-button size="small" disabled={appState.selectedCells.length === 0} onclick={() => appState.clearSelectedText()}>
        <sl-icon name="backspace"></sl-icon>
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Clear Image" placement="bottom">
      <sl-button size="small" disabled={appState.selectedCells.length === 0} onclick={() => appState.clearSelectedImage()}>
        <sl-icon name="image"></sl-icon>
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Clear Entire Cell" placement="bottom">
      <sl-button size="small" outline disabled={appState.selectedCells.length === 0} onclick={() => appState.clearEntireCell()}>
        <sl-icon name="trash"></sl-icon>
      </sl-button>
    </sl-tooltip>
  </div>

  <sl-divider vertical></sl-divider>

  <div class="tool-group">
    <sl-tooltip content="Flip Horizontal" placement="bottom">
      <sl-button size="small" disabled={appState.selectedCells.length === 0} onclick={() => appState.flipSelectedCells('horizontal')}>
        <sl-icon name="symmetry-vertical"></sl-icon> 
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Flip Vertical" placement="bottom">
      <sl-button size="small" disabled={appState.selectedCells.length === 0} onclick={() => appState.flipSelectedCells('vertical')}>
        <sl-icon name="symmetry-horizontal"></sl-icon>
      </sl-button>
    </sl-tooltip>
  </div>

  <div class="spacer"></div>

  <div class="tool-group">
    <span class="zoom-level">{Math.round(zoomLevel * 100)}%</span>

    <sl-tooltip content="Zoom Out" placement="bottom">
      <sl-button size="small" onclick={zoomOut}>
        <sl-icon name="dash"></sl-icon>
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Zoom In" placement="bottom">
      <sl-button size="small" onclick={zoomIn}>
        <sl-icon name="plus"></sl-icon>
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Reset Zoom (1:1)" placement="bottom">
      <sl-button size="small" onclick={resetZoom}>
        1:1
      </sl-button>
    </sl-tooltip>

    <sl-tooltip content="Fit to Screen" placement="bottom">
      <sl-button size="small" onclick={fitToScreen}>
        <sl-icon name="arrows-fullscreen"></sl-icon>
      </sl-button>
    </sl-tooltip>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: var(--sl-color-neutral-0);
    border-bottom: 1px solid var(--sl-color-neutral-200);
  }

  .tool-group {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .spacer {
    flex: 1;
  }

  .zoom-level {
    font-size: 0.8rem;
    color: var(--sl-color-neutral-500);
    margin-right: 0.5rem;
    font-family: var(--sl-font-mono);
  }
</style>