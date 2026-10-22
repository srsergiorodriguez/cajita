<script>
  import { appState, SHAPE_PACKS } from '$stores/appState.svelte.js';
  import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
  import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';
  import '@shoelace-style/shoelace/dist/components/divider/divider.js';
  import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
  import '@shoelace-style/shoelace/dist/components/tab/tab.js';
  import '@shoelace-style/shoelace/dist/components/range/range.js';
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
  import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
  import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';

  import MotivoShape from "$components/MotivoShape.svelte";

  let tabGroup = $state(); // Reference to manually control the Shoelace tabs

  let currentMarkCode = $derived(
    appState.selectedCell === null 
      ? "000000" 
      : appState.gridData[appState.selectedCell].slice(appState.selectedMark * 6, (appState.selectedMark * 6) + 6)
  );

  function handleChange(attrIndex, event) {
    const value = event.target.value;
    appState.updateAttribute(attrIndex, value);
  }

  function shiftMarks(direction) {
    if (appState.selectedCells.length === 0) return;
    appState.saveState();

    // Force a complete array re-assignment to guarantee Svelte triggers a canvas redraw
    let newData = [...appState.gridData]; 
    
    // Determine the current layer and the target layer we are swapping it with
    let currentIdx = appState.selectedMark;
    let targetIdx = direction === 'right' ? (currentIdx + 1) % 3 : (currentIdx + 2) % 3;

    for (let i of appState.selectedCells) {
      let code = newData[i];
      // Break the code into an array of 3 strings
      let marks = [code.slice(0, 6), code.slice(6, 12), code.slice(12, 18)];

      // Swap the current mark with the target mark
      let temp = marks[currentIdx];
      marks[currentIdx] = marks[targetIdx];
      marks[targetIdx] = temp;

      // Rejoin them into the 18-character string
      newData[i] = marks.join('');
    }
    
    appState.gridData = newData;
    appState.selectedMark = targetIdx;

    // Manually force Shoelace to switch the active tab UI so the user "follows" the layer
    if (tabGroup) {
      tabGroup.show(targetIdx.toString());
    }
  }

  const previewSize = 40;
  const previewSizes = [
    Math.ceil(previewSize * 0.25), 
    Math.ceil(previewSize * 0.5), 
    Math.ceil(previewSize * 0.75), 
    Math.ceil(previewSize)
  ];
  const previewRotations = [0, 90, 180, 270];

  function getPreviewPos(index) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: Math.ceil(col * (previewSize / 2)),
      y: Math.ceil(row * (previewSize / 2))
    };
  }
</script>

<div class="panel-container">
  <div class="panel-header">
    <h3>Motivo Config</h3>
  </div>
  <p class="panel-subtitle">Edit geometry for the selected cell.</p>

  {#if appState.selectedCell === null}
    <div class="panel-empty">
      <p>Select a cell on the canvas to edit its marks.</p>
    </div>
  {:else}
    <div class="panel-stack">
      
      <sl-tab-group bind:this={tabGroup} onsl-tab-show={(e) => appState.selectedMark = parseInt(e.detail.name)}>
        <sl-tab slot="nav" panel="0" active={appState.selectedMark === 0}>Mark 1</sl-tab>
        <sl-tab slot="nav" panel="1" active={appState.selectedMark === 1}>Mark 2</sl-tab>
        <sl-tab slot="nav" panel="2" active={appState.selectedMark === 2}>Mark 3</sl-tab>
      </sl-tab-group>

      <div class="panel-section compact-row">
        
        <div class="inline-group">
          <label class="panel-label">Visibility</label>
          <sl-checkbox 
            size="small"
            checked={currentMarkCode[0] === "1"} 
            onsl-change={(e) => appState.updateAttribute(0, e.target.checked ? "1" : "0")}>
          </sl-checkbox>
        </div>

        <div class="mark-preview" title="Layer Preview">
          <svg viewBox="0 0 40 40" width="32" height="32" style="overflow: hidden; border-radius: 4px;">
            <rect width="40" height="40" fill="var(--sl-color-neutral-100)" stroke="var(--sl-color-neutral-300)" stroke-width="1"/>
            
            {#if currentMarkCode[0] === "1"}
              {@const shape = parseInt(currentMarkCode[1])}
              {@const color = parseInt(currentMarkCode[2])}
              {@const s = previewSizes[parseInt(currentMarkCode[3])]}
              {@const pos = getPreviewPos(parseInt(currentMarkCode[4]))}
              {@const rot = previewRotations[parseInt(currentMarkCode[5])]}

              <g transform="translate({pos.x}, {pos.y}) rotate({rot})">
                <MotivoShape shape={shape} color={color} {s} />
              </g>
            {/if}
          </svg>
        </div>

        <div class="inline-group">
          <label class="panel-label">Layer</label>
          <div class="arrows">
            <sl-tooltip content="Send Backward" placement="top">
              <sl-icon-button name="arrow-left-circle" onclick={() => shiftMarks('left')}></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip content="Bring Forward" placement="top">
              <sl-icon-button name="arrow-right-circle" onclick={() => shiftMarks('right')}></sl-icon-button>
            </sl-tooltip>
          </div>
        </div>

      </div>

      <sl-divider style="margin: 0.5rem 0;"></sl-divider>

      <div class="panel-section">
        <label class="panel-label">Shape</label>
        <sl-radio-group size="small" value={currentMarkCode[1]} onsl-change={(e) => handleChange(1, e)}>
          {#each SHAPE_PACKS[appState.shapePack].shapes as shapeName, i}
            <sl-radio-button size="small" value={i.toString()}>{shapeName}</sl-radio-button>
          {/each}
        </sl-radio-group>
      </div>

      <div class="panel-section">
        <label class="panel-label">Color</label>
        <div class="color-swatches">
          {#each appState.palette as colorHex, i}
            <button 
              class="swatch" 
              class:active={parseInt(currentMarkCode[2]) === i}
              style="background-color: {colorHex};"
              onclick={() => appState.updateAttribute(2, i.toString())}
              title={`Palette Color ${i + 1}`}
            ></button>
          {/each}
        </div>
      </div>

      <div class="panel-section">
        <label class="panel-label">Size</label>
        <sl-radio-group size="small" value={currentMarkCode[3]} onsl-change={(e) => handleChange(3, e)}>
          <sl-radio-button size="small" value="0">S</sl-radio-button>
          <sl-radio-button size="small" value="1">M</sl-radio-button>
          <sl-radio-button size="small" value="2">L</sl-radio-button>
          <sl-radio-button size="small" value="3">XL</sl-radio-button>
        </sl-radio-group>
      </div>

      <div class="panel-section">
        <label class="panel-label">Position</label>
        <div class="position-grid">
          {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as pos}
            <button 
              class="pos-btn" 
              class:active={parseInt(currentMarkCode[4]) === pos}
              onclick={() => appState.updateAttribute(4, pos.toString())}
              title={`Position ${pos}`}
            ></button>
          {/each}
        </div>
      </div>

      {#if SHAPE_PACKS[appState.shapePack].rotatable.includes(parseInt(currentMarkCode[1]))}
        <div class="panel-section rotation-wrapper">
          <div class="label-row">
            <label class="panel-label">Rotation</label>
            <span class="value-display">{parseInt(currentMarkCode[5]) * 90}°</span>
          </div>
          <sl-range 
            min="0" max="3" step="1" 
            value={currentMarkCode[5]} 
            onsl-input={(e) => handleChange(5, e)}> 
          </sl-range>
        </div>
      {/if}

    </div>
  {/if}
</div>

<style>
  .compact-row {
    display: flex;
    flex-direction: row !important;
    justify-content:space-evenly;
    align-items: center;
    margin-top: 0.5rem;
  }

  .inline-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .inline-group .panel-label {
    margin: 0;
  }

  .arrows {
    display: flex;
    gap: 0.1rem;
  }

  .arrows sl-icon-button::part(base) {
    color: var(--sl-color-primary-600);
    padding: 0;
    font-size: 1.25rem;
    transition: transform 0.1s ease;
  }

  .arrows sl-icon-button:hover::part(base) {
    transform: scale(1.1);
    color: var(--sl-color-primary-700);
  }

  .arrows {
    display: flex;
    gap: 0.25rem;
  }

  .arrows sl-icon-button::part(base) {
    color: var(--sl-color-primary-600);
    padding: 0;
    font-size: 1.25rem;
    transition: transform 0.1s ease;
  }

  .arrows sl-icon-button:hover::part(base) {
    transform: scale(1.1);
    color: var(--sl-color-primary-700);
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .value-display {
    font-size: var(--sl-font-size-small);
    color: var(--sl-color-primary-600);
    font-weight: 600;
  }

  /* Color Swatches */
  .color-swatches {
    display: flex;
    gap: 0.5rem;
  }

  .swatch {
    width: 2rem;
    height: 2rem;
    border-radius: var(--sl-border-radius-circle);
    border: 2px solid var(--sl-color-neutral-200);
    cursor: pointer;
    transition: transform 0.1s ease, border-color 0.1s ease;
    padding: 0;
  }

  .swatch:hover {
    transform: scale(1.1);
  }

  .swatch.active {
    border-color: var(--sl-color-primary-600);
    transform: scale(1.1);
    box-shadow: 0 0 0 2px var(--sl-color-primary-200);
  }

  /* Position Grid */
  .position-grid {
    display: grid;
    grid-template-columns: repeat(3, 1.5rem);
    grid-template-rows: repeat(3, 1.5rem);
    gap: 4px;
  }

  .pos-btn {
    background-color: var(--sl-color-neutral-100);
    border: 1px solid var(--sl-color-neutral-300);
    border-radius: var(--sl-border-radius-medium);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .pos-btn:hover {
    background-color: var(--sl-color-neutral-200);
  }

  .pos-btn.active {
    background-color: var(--sl-color-primary-600);
    border-color: var(--sl-color-primary-600);
  }

  .mark-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    border-radius: 4px;
    background: var(--sl-color-neutral-0);
  }

  /* Utilities */
  .rotation-wrapper {
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>