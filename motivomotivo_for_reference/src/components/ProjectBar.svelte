<script>
  import '@shoelace-style/shoelace/dist/components/color-picker/color-picker.js';
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/divider/divider.js';
  import '@shoelace-style/shoelace/dist/components/alert/alert.js';
  import '@shoelace-style/shoelace/dist/components/icon/icon.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import '@shoelace-style/shoelace/dist/components/range/range.js';

  import { getPaletteSync } from 'colorthief';
  
  import { save } from '@tauri-apps/plugin-dialog';
  import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';
  import { appState, PALETTE_PRESETS, DIMENSIONS_PRESETS } from '$stores/appState.svelte.js';
  
  // Decoupled Export Engine
  import { getCleanSVGString, generateCleanPNG } from '$lib/exportEngine.js';

  // Environment Check
  const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  function swapDimensions() {
    appState.updateLayout(appState.page.height, appState.page.width, appState.page.marginPercent, appState.page.divsW);
  }

  function handlePresetChange(event) {
    const selected = DIMENSIONS_PRESETS.find(p => p.id === event.target.value);
    if (selected) {
      appState.updateLayout(selected.w, selected.h, appState.page.marginPercent, appState.page.divsW);
    }
  }

  function showToast(message) {
    const alert = Object.assign(document.createElement('sl-alert'), {
      variant: 'success',
      closable: true,
      duration: 3000,
      innerHTML: `<sl-icon name="check2-circle" slot="icon"></sl-icon> <strong>${message}</strong>`
    });
    document.body.append(alert);
    return alert.toast();
  }

  // Helper for Web Browser Downloads
  function webDownload(filename, content, isDataUrl = false) {
    const element = document.createElement('a');
    if (isDataUrl) {
      element.setAttribute('href', content);
    } else {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      element.setAttribute('href', URL.createObjectURL(blob));
    }
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  async function exportSVG() {
    const svgString = await getCleanSVGString();
    const defaultName = `motivo_${Date.now()}.svg`;

    if (isDesktop) {
      const filePath = await save({
        title: 'Save Vector Composition',
        defaultPath: defaultName,
        filters: [{ name: 'SVG Vector', extensions: ['svg'] }]
      });
      if (filePath) {
        await writeTextFile(filePath, svgString);
        showToast('SVG exported!');
      }
    } else {
      // Web Fallback
      webDownload(defaultName, svgString);
      showToast('SVG downloaded!');
    }
  }

  // State to control the warning modal
  let showExportWarning = $state(false);

  // 1. Initial Check
  async function exportPNG() {
    const fusionPanel = document.querySelector('sl-tab-panel[name="fusion"]');
    const isFusionActive = fusionPanel && fusionPanel.hasAttribute('active');
    
    if (!isFusionActive && appState.effects.active.length > 0) {
      showExportWarning = true;
    } else {
      await processPNGExport(isFusionActive);
    }
  }

  // 2. The actual export execution
  async function processPNGExport(isFusionActive) {
    showExportWarning = false;
    let bytes;
    let pngDataUrl = ""; 

    if (isFusionActive) {
      const sourceCanvas = document.querySelector('.fusion-space-container canvas');
      if (sourceCanvas) {
        pngDataUrl = sourceCanvas.toDataURL('image/png', 1.0);
        
        // Convert raster Data URL to bytes for Tauri
        const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, "");
        const binaryString = atob(base64Data);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      } else {
        return; // Failsafe
      }
    } else {
      try {
        // Fetch raw bytes directly from the decoupled engine
        bytes = await generateCleanPNG();
        
        // Reconstruct the Data URL for the web download fallback
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        pngDataUrl = `data:image/png;base64,${btoa(binary)}`;
        
      } catch (err) {
        console.error("Error creating clean PNG:", err);
        return;
      }
    }

    // 3. Save the resulting file
    const defaultName = `motivo_${!isFusionActive ? 'clean' : 'fusion'}_${Date.now()}.png`;

    if (isDesktop) {
      try {
        const filePath = await save({
          title: !isFusionActive ? 'Save Clean PNG Image' : 'Save Post-Processed PNG',
          defaultPath: defaultName,
          filters: [{ name: 'PNG Image', extensions: ['png'] }]
        });

        if (filePath) {
          await writeFile(filePath, bytes);
          showToast(!isFusionActive ? 'Clean PNG exported!' : 'Post-processed PNG exported!');
        }
      } catch (err) {
        console.error("Failed to save via Tauri:", err);
      }
    } else {
      webDownload(defaultName, pngDataUrl, true);
      showToast(!isFusionActive ? 'Clean PNG downloaded!' : 'Post-processed PNG downloaded!');
    }
  }

  // PALETTE GENERATOR
  let isDraggingOver = $state(false);

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    isDraggingOver = true;
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    isDraggingOver = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    isDraggingOver = false;

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      console.error("Invalid file type dropped");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const palette = getPaletteSync(img, { colorCount: 4 });

          if (palette && palette.length >= 4) {
            const hexPalette = palette.slice(0, 4).map(color => color.hex());
            appState.loadPalette(hexPalette);
            showToast('Palette extracted!');
          }
        } catch (err) {
          console.error("Colorthief Error:", err);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
</script>

<div class="panel-container">
  <div class="panel-header">
    <h3>Project Settings</h3>
  </div>
  <p class="panel-subtitle">Canvas dimensions and output.</p>
  
  <div class="panel-stack">
  
    <div class="panel-section">
      <label class="panel-label">Export</label>
      <div class="export-buttons">
        <sl-button size="small" variant="primary" outline onclick={exportSVG}>SVG</sl-button>
        <sl-button size="small" variant="primary" outline onclick={exportPNG}>PNG</sl-button>
      </div>
    </div>

    <div class="panel-section">
      <label class="panel-label">Dimensions</label>
      
      <sl-select size="small" placeholder="Select Preset" onsl-change={handlePresetChange}>
        {#each DIMENSIONS_PRESETS as p}
          <sl-option value={p.id}>{p.name}</sl-option>
        {/each}
      </sl-select>

      <div class="input-grid">
        <sl-input 
          size="small" 
          label="Width" 
          type="number" 
          value={appState.page.width} 
          onsl-change={(e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 100) val = 100; 
            e.target.value = val; 
            appState.updateLayout(val, appState.page.height, appState.page.marginPercent, appState.page.divsW);
          }}>
        </sl-input>

        <div class="swap-btn-wrapper">
          <sl-tooltip content="Swap Width & Height" placement="top">
            <sl-icon-button name="arrow-left-right" onclick={swapDimensions}></sl-icon-button>
          </sl-tooltip>
        </div>
        
        <sl-input 
          size="small" 
          label="Height" 
          type="number" 
          value={appState.page.height} 
          onsl-change={(e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 100) val = 100; 
            e.target.value = val; 
            appState.updateLayout(appState.page.width, val, appState.page.marginPercent, appState.page.divsW);
          }}>
        </sl-input>
      </div>

      <div class="slider-group">
        <div class="label-row">
          <label class="custom-label">Subdivisions</label>
          <span class="value-display">{appState.page.divsW}</span>
        </div>
        <sl-range min="1" max="12" value={appState.page.divsW}
          onsl-input={(e) => appState.updateLayout(appState.page.width, appState.page.height, appState.page.marginPercent, parseInt(e.target.value))}>
        </sl-range>
      </div>

      <div class="slider-group">
        <div class="label-row">
          <label class="custom-label">Margin</label>
          <span class="value-display">{appState.page.marginPercent}%</span>
        </div>
        <sl-range min="0" max="25" value={appState.page.marginPercent}
          onsl-input={(e) => appState.updateLayout(appState.page.width, appState.page.height, parseInt(e.target.value), appState.page.divsW)}>
        </sl-range>
      </div>
    </div>

    <div class="panel-section">
      <label class="panel-label">Color scheme</label>

      <div class="color-row">
        <span>Background</span>
        <sl-color-picker 
          value={appState.bgColor} 
          format="hex" 
          size="small"
          onsl-change={(e) => appState.updateBgColor(e.target.value)}>
        </sl-color-picker>
      </div>
      
      <div class="palette-list">
        {#each appState.palette as color, i}
          <div class="color-row">
            <span>Color {i + 1}</span>
            <sl-color-picker 
              value={color} 
              format="hex" 
              size="small"
              onsl-change={(e) => appState.updatePaletteColor(i, e.target.value)}>
            </sl-color-picker>
          </div>
        {/each}
      </div>

      <sl-divider></sl-divider>

      <label class="panel-label">Palette Presets</label>

      <div class="selector-row">
        <div class="panel-section">
          <sl-select size="small" placeholder="Load Preset" onsl-change={(e) => {
            const p = PALETTE_PRESETS.find(p => p.name === e.target.value);
            if (p) appState.loadPalette(p.colors);
          }}>
            {#each PALETTE_PRESETS as p}
              <sl-option value={p.name}>{p.name}</sl-option>
            {/each}
          </sl-select>
        </div>

        <sl-tooltip content="Randomize palette" placement="top">
          <sl-button size="small" circle onclick={() => appState.randomizePalette()}>
            <sl-icon name="dice-5"></sl-icon>
          </sl-button>
        </sl-tooltip>
      </div>

      <label class="panel-label">Palette Extractor</label>

      <div 
        class="color-dropzone {isDraggingOver ? 'drag-active' : ''}"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
      >
        <div class="dropzone-content">
          <sl-icon name="image"></sl-icon>
          <span>Drop image to extract palette</span>
        </div>
      </div>

    </div>

  </div>
</div>

<sl-dialog label="Active Effects Detected" open={showExportWarning} onsl-after-hide={() => showExportWarning = false}>
  <div style="margin-bottom: 1rem; color: var(--sl-color-neutral-600);">
    <p style="margin-top: 0;">You have Post-Processing effects active in the Fusion tab.</p>
    <p>Exporting from this menu will save the <strong>clean, flat composition</strong>.</p>
    <p style="margin-bottom: 0;">If you want the textured version, cancel this and switch to the Fusion tab before exporting.</p>
  </div>
  
  <sl-button slot="footer" variant="default" onclick={() => showExportWarning = false}>
    Cancel
  </sl-button>
  <sl-button slot="footer" variant="primary" onclick={() => processPNGExport(false)}>
    Export Clean PNG
  </sl-button>
</sl-dialog>

<style>
  .input-grid {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  :global(sl-input) {
    flex: 1;
    min-width: 0 !important;
    width: 100% !important;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--sl-font-size-small);
    margin-bottom: 0.25rem;
  }

  .selector-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1.5rem; 
  }

  .selector-row sl-select {
    flex: 1; 
  }

  .custom-label {
    font-size: var(--sl-input-label-font-size-small);
    color: var(--sl-input-label-color);
  }

  .value-display {
    color: var(--sl-color-primary-600);
    font-weight: 600;
  }

  .color-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--sl-font-size-small);
  }

  .palette-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .export-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .export-buttons sl-button {
    flex: 1;
  }

  .swap-btn-wrapper {
    display: flex;
    align-items: flex-end;
    padding-bottom: 0.1rem;
  }

  .swap-btn-wrapper sl-icon-button::part(base) {
    color: var(--sl-color-neutral-500);
    transition: color 0.2s ease, transform 0.2s ease;
  }

  .swap-btn-wrapper sl-icon-button:hover::part(base) {
    color: var(--sl-color-primary-600);
    transform: scale(1.1);
  }

  .color-dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    margin-bottom: 1rem;
    border: 2px dashed var(--sl-color-neutral-300);
    border-radius: var(--sl-border-radius-medium);
    background-color: var(--sl-color-neutral-50);
    transition: all 0.2s ease;
    cursor: copy;
  }

  .dropzone-content {
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: var(--sl-color-neutral-500);
  }

  .color-dropzone.drag-active {
    border-color: var(--sl-color-primary-500);
    background-color: var(--sl-color-primary-50);
    transform: scale(1.02);
  }
  
  .color-dropzone.drag-active .dropzone-content {
    color: var(--sl-color-primary-600);
  }
</style>