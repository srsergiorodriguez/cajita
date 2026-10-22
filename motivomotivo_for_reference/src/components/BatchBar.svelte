<script>
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/divider/divider.js';
  import '@shoelace-style/shoelace/dist/components/icon/icon.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import '@shoelace-style/shoelace/dist/components/progress-bar/progress-bar.js';

  import { open } from '@tauri-apps/plugin-dialog';
  import { readTextFile, readFile, writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
  import { join } from '@tauri-apps/api/path';
  
  import { appState } from '$stores/appState.svelte.js';
  import { generateCleanPNG, getCleanSVGString } from '$lib/exportEngine.js';

  const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  let csvPath = $state(null);
  let imageDir = $state(null);
  let outputDir = $state(isDesktop ? null : "Browser Downloads"); // Auto-assign for web
  
  let parsedHeaders = $state([]);
  let parsedRows = $state([]);
  let webImageMap = {}; // In-memory storage for web folder uploads
  
  let filenameColumn = $state('filename');
  let fallbackPrefix = $state('motivo_batch_');
  let exportFormat = $state('png');

  let isProcessing = $state(false);
  let progress = $state({ current: 0, total: 0 });

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

  async function selectCSV() {
    if (isDesktop) {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'CSV File', extensions: ['csv'] }]
      });
      if (selected) {
        csvPath = selected;
        const content = await readTextFile(selected);
        parseCSV(content);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          csvPath = file.name;
          const reader = new FileReader();
          reader.onload = (event) => parseCSV(event.target.result);
          reader.readAsText(file);
        }
      };
      input.click();
    }
  }

  async function selectDirectory(target) {
    if (isDesktop) {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        if (target === 'image') imageDir = selected;
        if (target === 'output') outputDir = selected;
      }
    } else {
      if (target === 'image') {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        input.onchange = async (e) => {
          const files = Array.from(e.target.files);
          if (files.length > 0) {
            imageDir = "Web Browser Memory";
            webImageMap = {};
            
            const loadAsBase64 = (file) => new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target.result);
              reader.readAsDataURL(file);
            });

            for (const file of files) {
              if (file.type.startsWith('image/')) {
                webImageMap[file.name] = await loadAsBase64(file);
              }
            }
          }
        };
        input.click();
      }
    }
  }

  function parseCSV(content) {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return;

    parsedHeaders = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const rowObj = {};
      parsedHeaders.forEach((h, idx) => {
        rowObj[h] = values[idx] || null;
      });
      rows.push(rowObj);
    }
    parsedRows = rows;
  }

  async function applyRowDataToGrid(row) {
    const divsW = appState.page.divsW;
    const divsH = appState.page.divsH;

    for (const [key, value] of Object.entries(row)) {
      if (!value) continue;

      const match = key.match(/^([it])(\d+)_(\d+)$/);
      if (match) {
        const type = match[1];
        const col = parseInt(match[2], 10);
        const rowIdx = parseInt(match[3], 10);

        if (col >= 0 && col < divsW && rowIdx >= 0 && rowIdx < divsH) {
          const index = (rowIdx * divsW) + col;

          if (type === 't') {
            appState.updateTextAttribute(index, 'content', value);
          } 
          else if (type === 'i' && imageDir) {
            try {
              if (isDesktop) {
                const imgPath = await join(imageDir, value);
                const bytes = await readFile(imgPath);
                
                let binary = '';
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                
                const ext = value.split('.').pop().toLowerCase();
                const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
                
                appState.updateImageAttribute(index, 'src', `data:${mime};base64,${base64}`);
              } else {
                // Web Fallback: Retrieve from memory map
                if (webImageMap[value]) {
                  appState.updateImageAttribute(index, 'src', webImageMap[value]);
                } else {
                  console.warn(`Image ${value} not found in selected web folder.`);
                }
              }
            } catch (e) {
              console.error(`Failed to load image for row: ${value}`, e);
            }
          }
        }
      }
    }
  }

  async function startBatchProcess() {
    if (!csvPath || !outputDir || parsedRows.length === 0) return;
    
    isProcessing = true;
    progress = { current: 0, total: parsedRows.length };

    const templateSnapshot = appState.getProjectJSON();
    const preservedUndo = JSON.parse(JSON.stringify(appState.undoStack));
    const preservedRedo = JSON.parse(JSON.stringify(appState.redoStack));

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      
      appState.loadProjectJSON(templateSnapshot);
      await applyRowDataToGrid(row); 
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      try {
        let baseName = row[filenameColumn] ? row[filenameColumn].trim() : "";
        if (!baseName) {
          baseName = `${fallbackPrefix}${String(i + 1).padStart(3, '0')}`;
        }

        baseName = baseName.replace(/\.(png|svg)$/i, '');
        const fileName = `${baseName}.${exportFormat}`;

        if (exportFormat === 'png') {
          const imageBytes = await generateCleanPNG();
          if (isDesktop) {
            const filePath = await join(outputDir, fileName);
            await writeFile(filePath, imageBytes);
          } else {
            // Reconstruct Data URL for Web
            let binary = '';
            for (let b = 0; b < imageBytes.byteLength; b++) {
                binary += String.fromCharCode(imageBytes[b]);
            }
            const pngDataUrl = `data:image/png;base64,${btoa(binary)}`;
            webDownload(fileName, pngDataUrl, true);
          }
        } else {
          const svgString = await getCleanSVGString();
          if (isDesktop) {
            const filePath = await join(outputDir, fileName);
            await writeTextFile(filePath, svgString);
          } else {
            webDownload(fileName, svgString);
          }
        }
      } catch (e) {
        console.error(`Export failed on row ${i + 1}`, e);
      }
      
      progress.current = i + 1;
    }
    
    appState.loadProjectJSON(templateSnapshot);
    appState.undoStack = preservedUndo;
    appState.redoStack = preservedRedo;

    isProcessing = false;
  }
</script>

<div class="panel-container">
  <div class="panel-header">
    <h3>Batch Export</h3>
  </div>
  <p class="panel-subtitle">Map CSV data to grid coordinates.</p>

  <div class="panel-stack">
    
    <div class="panel-section">
      <label class="panel-label">Data Source</label>
      <sl-button size="small" variant={csvPath ? 'default' : 'primary'} onclick={selectCSV}>
        <sl-icon slot="prefix" name="filetype-csv"></sl-icon>
        {csvPath ? (isDesktop ? 'Change CSV File' : csvPath) : 'Select CSV File'}
      </sl-button>
      
      {#if parsedRows.length > 0}
        <p class="status-text">{parsedRows.length} rows loaded.</p>
      {/if}
    </div>

    <div class="panel-section">
      <label class="panel-label">Asset Directory</label>
      <sl-button size="small" variant={imageDir ? 'default' : 'primary'} outline onclick={() => selectDirectory('image')}>
        <sl-icon slot="prefix" name="folder"></sl-icon>
        {imageDir ? 'Change Image Folder' : 'Select Image Folder'}
      </sl-button>
      <p class="status-text">Required if mapping images (e.g., column 'i0_1').</p>
    </div>

    <sl-divider></sl-divider>
    
    <div class="panel-section">
      <label class="panel-label">Export Format</label>
      <sl-select size="small" value={exportFormat} onsl-change={(e) => exportFormat = e.target.value}>
        <sl-option value="png">PNG (Rasterized Image)</sl-option>
        <sl-option value="svg">SVG (Plotter-ready Vectors)</sl-option>
      </sl-select>
    </div>

    <div class="panel-section">
      <label class="panel-label">File Naming</label>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <sl-input 
          size="small" 
          label="Filename Column (Optional)" 
          placeholder="e.g., filename"
          value={filenameColumn}
          onsl-input={(e) => filenameColumn = e.target.value}
        ></sl-input>
        
        <sl-input 
          size="small" 
          label="Fallback Prefix" 
          placeholder="e.g., motivo_batch_"
          value={fallbackPrefix}
          onsl-input={(e) => fallbackPrefix = e.target.value}
        ></sl-input>
      </div>
      <p class="status-text">If column is missing or empty, prefix + number is used.</p>
    </div>

    <sl-divider></sl-divider>

    <div class="panel-section">
      <label class="panel-label">Export Destination</label>
      {#if isDesktop}
        <sl-button size="small" variant={outputDir ? 'default' : 'primary'} onclick={() => selectDirectory('output')}>
          <sl-icon slot="prefix" name="folder-check"></sl-icon>
          {outputDir ? 'Change Output Folder' : 'Select Output Folder'}
        </sl-button>
      {:else}
        <sl-button size="small" variant="default" disabled>
          <sl-icon slot="prefix" name="folder-check"></sl-icon>
          Saves to Downloads Folder
        </sl-button>
        <p class="status-text" style="color: var(--sl-color-warning-600);">Note: The browser may ask for permission to download multiple files.</p>
      {/if}
    </div>

    <div class="panel-section action-section">
      <sl-button 
        variant="success" 
        loading={isProcessing} 
        disabled={!csvPath || !outputDir || parsedRows.length === 0}
        onclick={startBatchProcess}
      >
        <sl-icon slot="prefix" name="play-fill"></sl-icon>
        Run Batch
      </sl-button>

      {#if isProcessing}
        <sl-progress-bar value={(progress.current / progress.total) * 100} class="progress-bar"></sl-progress-bar>
        <p class="status-text">Processing: {progress.current} / {progress.total}</p>
      {/if}
    </div>

  </div>
</div>

<style>
  .status-text {
    font-size: 0.75rem;
    color: var(--sl-color-neutral-500);
    margin-top: 0.25rem;
  }
  .action-section {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .action-section sl-button {
    width: 100%;
  }
  .progress-bar {
    --height: 6px;
    margin-top: 0.5rem;
  }
</style>