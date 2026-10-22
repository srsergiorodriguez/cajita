<script>
  import { appState } from '$stores/appState.svelte.js';
  import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
  import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';
  import '@shoelace-style/shoelace/dist/components/divider/divider.js';
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/icon/icon.js';
  import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
  import { availableFonts } from '$lib/fontManager.js';

  const selectedCell = $derived(appState.selectedCells.length === 1 ? appState.selectedCells[0] : null);
  const hasSelection = $derived(selectedCell !== null);
  
  const textBlock = $derived(hasSelection ? appState.textData[selectedCell] : null);
  
  const content = $derived(textBlock?.content ?? "");
  const span = $derived(textBlock?.span ?? 2);
  const size = $derived(textBlock?.size ?? 24);
  const leading = $derived(textBlock?.leading ?? 1.2);
  const font = $derived(textBlock?.font ?? (availableFonts[0]?.family || "sans-serif"));
  const align = $derived(textBlock?.align ?? "left");
  const dir = $derived(textBlock?.dir ?? "horizontal");
  const colorIndex = $derived(textBlock?.colorIndex ?? 0);

  const customFonts = $derived(appState.customFonts || []);

  function update(attr, value) {
    if (hasSelection) appState.updateTextAttribute(selectedCell, attr, value);
  }  

  async function handleFontUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (customFonts.length >= appState.maxCustomFonts) {
      console.warn(`Custom font limit reached (${appState.maxCustomFonts}).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      // Clean up the filename for the UI
      const cleanName = file.name.split('.')[0].replace(/[^a-zA-Z0-9\s-]/g, '');
      const familyName = `custom-${Date.now()}`; // Unique internal ID

      try {
        // 1. Inject into the browser instantly
        const fontFace = new FontFace(familyName, `url(${dataUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);

        // 2. Save to appState
        appState.saveState(true);
        appState.customFonts = [...customFonts, { name: cleanName, family: familyName, dataUrl }];

        // 3. Automatically apply it to the selected text block
        update('font', familyName);
      } catch (err) {
        console.error("Failed to load custom font", err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset the input
  }

  function removeCustomFont(family) {
    appState.saveState(true);
    appState.customFonts = customFonts.filter(f => f.family !== family);
    
    // If the currently selected text was using this font, revert it to default
    if (font === family) {
      update('font', availableFonts[0]?.family || "sans-serif");
    }
  }
</script>

<div class="panel-container">
  <div class="panel-header">
    <h3>Text Config</h3>
  </div>
  <p class="panel-subtitle">Edit typography for the selected cell.</p>

  {#if !hasSelection}
    <div class="panel-empty">
      <p>Select a single cell on the canvas to add or edit text.</p>
    </div>
  {:else}
    <div class="panel-stack">
      
      <sl-textarea 
        label="Content" 
        placeholder="Type here..." 
        value={content}
        rows="4"
        onsl-input={(e) => update('content', e.target.value)}>
      </sl-textarea>

      <div class="panel-section">
        <label class="panel-label">Layout</label>
        <div class="row">
          <sl-input 
            type="number" 
            label="Span" 
            min="1" 
            max={Math.max(appState.page.divsW, appState.page.divsH)}
            value={span}
            size="small"
            onsl-input={(e) => update('span', parseInt(e.target.value) || 2)}>
          </sl-input>

          <sl-input 
            type="number" 
            label="Size" 
            min="8" 
            max="400" 
            value={size}
            size="small"
            onsl-input={(e) => update('size', parseInt(e.target.value) || 24)}>
          </sl-input>

          <sl-input 
            type="number" 
            label="Leading" 
            min="0.5" 
            max="3.0" 
            step="0.1"
            size="small"
            value={leading}
            onsl-input={(e) => update('leading', parseFloat(e.target.value) || 1.2)}>
          </sl-input>
        </div>
      </div>

      <div class="panel-section">
        <label class="panel-label">Typography</label>
        
        <sl-select 
          label="Typeface" 
          value={font} 
          size="small"
          onsl-change={(e) => update('font', e.target.value)}>
          
          {#each availableFonts as f}
            <sl-option value={f.family}>{f.name}</sl-option>
          {/each}

          {#if customFonts.length > 0}
            <sl-divider></sl-divider>
            {#each customFonts as cf}
              <sl-option value={cf.family}>
                {cf.name} (Custom)
              </sl-option>
            {/each}
          {/if}
        </sl-select>

        <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <input type="file" id="font-upload" accept=".ttf,.otf,.woff,.woff2" style="display: none" onchange={handleFontUpload} />
          
          <sl-button size="small" outline disabled={customFonts.length >= 2} onclick={() => document.getElementById('font-upload').click()}>
            <sl-icon slot="prefix" name="cloud-upload"></sl-icon>
            {customFonts.length >= 2 ? 'Font Limit Reached' : 'Upload Custom Font'}
          </sl-button>

          {#each customFonts as cf}
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; padding: 0.25rem 0.5rem; background: var(--sl-color-neutral-100); border-radius: var(--sl-border-radius-small);">
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{cf.name}</span>
              <sl-icon-button name="trash" label="Delete Font" style="font-size: 1rem; color: var(--sl-color-danger-600);" onclick={() => removeCustomFont(cf.family)}></sl-icon-button>
            </div>
          {/each}
        </div>

        <div class="row">
          <div class="control-group">
            <label class="sl-label">Alignment</label>
            <sl-radio-group size="small" value={align} onsl-change={(e) => update('align', e.target.value)}>
              <sl-radio-button value="left" title="Left"><sl-icon name="text-left"></sl-icon></sl-radio-button>
              <sl-radio-button value="center" title="Center"><sl-icon name="text-center"></sl-icon></sl-radio-button>
              <sl-radio-button value="right" title="Right"><sl-icon name="text-right"></sl-icon></sl-radio-button>
            </sl-radio-group>
          </div>

          <div class="control-group">
            <label class="sl-label">Direction</label>
            <sl-radio-group size="small" value={dir} onsl-change={(e) => update('dir', e.target.value)}>
              <sl-radio-button value="horizontal" title="Horizontal"><sl-icon name="type"></sl-icon></sl-radio-button>
              <sl-radio-button value="vertical" title="Vertical"><sl-icon name="type" style="transform: rotate(90deg); display: inline-block;"></sl-icon></sl-radio-button>
            </sl-radio-group>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <label class="panel-label">Text Color</label>
        <div class="color-swatches">
          {#each appState.palette as color, i}
            <button 
              class="swatch {colorIndex === i ? 'active' : ''}" 
              style="background-color: {color};"
              title="Color {i + 1}"
              onclick={() => update('colorIndex', i)}>
            </button>
          {/each}
        </div>
      </div>

    </div>
  {/if}
</div>

<style>
  /* Only Text-specific styling remains! */
  .row {
    display: flex;
    gap: 0.75rem;
  }

  .row > * {
    flex: 1;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sl-label {
    font-size: var(--sl-input-label-font-size-medium);
    color: var(--sl-input-label-color);
  }

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
</style>