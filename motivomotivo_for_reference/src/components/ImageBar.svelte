<script>
  import { appState } from '$stores/appState.svelte.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/icon/icon.js';
  import '@shoelace-style/shoelace/dist/components/alert/alert.js';
  import '@shoelace-style/shoelace/dist/components/range/range.js';
  import '@shoelace-style/shoelace/dist/components/badge/badge.js';
  import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
  import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';

  const selectedCell = $derived(appState.selectedCells.length === 1 ? appState.selectedCells[0] : null);
  const hasSelection = $derived(selectedCell !== null);
  
  const imageBlock = $derived(hasSelection ? appState.imageData[selectedCell] : null);
  
  const src = $derived(imageBlock?.src ?? "");
  const spanW = $derived(imageBlock?.spanW ?? 1);
  const spanH = $derived(imageBlock?.spanH ?? 1);
  const padding = $derived(imageBlock?.padding ?? 0);
  const align = $derived(imageBlock?.align ?? "center");

  const totalImages = $derived(Object.keys(appState.imageData).length);
  const isAtMaxLimit = $derived(!src && totalImages >= appState.maxImages);

  let fileInput = $state();

  function update(attr, value) {
    if (hasSelection) appState.updateImageAttribute(selectedCell, attr, value);
  }

  function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIMENSION = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
        
        update('src', compressedBase64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    if (fileInput) fileInput.value = '';
  }

  function clearImage() {
    appState.clearSelectedImage();
  }
</script>

<div class="panel-container">

  <div class="panel-header">
    <h3>Image Config</h3>
    <sl-badge variant={totalImages >= appState.maxImages ? 'danger' : 'primary'} pill>
      {totalImages} / {appState.maxImages}
    </sl-badge>
  </div>
  
  <p class="panel-subtitle">Place and scale embedded images.</p>

  {#if !hasSelection}
    <div class="panel-empty">
      <p>Select a single cell on the canvas to add or edit an image.</p>
    </div>
  {:else}
    <div class="panel-stack">
      
      <div class="panel-section">
        <input 
          type="file" 
          accept="image/png, image/jpeg, image/webp" 
          bind:this={fileInput} 
          onchange={handleImageSelect} 
          style="display: none;" 
        />

        {#if src}
          <div class="image-preview-container">
            <img class="image-preview" {src} alt="Cell embedded image" />
            <sl-button size="small" variant="danger" outline class="clear-btn" onclick={clearImage}>
              <sl-icon slot="prefix" name="trash"></sl-icon>
              Remove Image
            </sl-button>
          </div>
        {:else}
          <sl-button 
            variant="primary" 
            onclick={() => fileInput.click()} 
            disabled={isAtMaxLimit}
            style="width: 100%;">
            <sl-icon slot="prefix" name={isAtMaxLimit ? "ban" : "image"}></sl-icon>
            {isAtMaxLimit ? 'Maximum Limit Reached' : 'Upload Image'}
          </sl-button>
        {/if}
      </div>

      {#if src}
        <div class="panel-section">
          <label class="panel-label">Grid Coverage</label>
          <div class="row">
            <sl-input 
              type="number" 
              label="Width (Cells)" 
              min="1" 
              max={appState.page.divsW} 
              value={spanW}
              size="small"
              onsl-input={(e) => update('spanW', parseInt(e.target.value) || 1)}>
            </sl-input>

            <sl-input 
              type="number" 
              label="Height (Cells)" 
              min="1" 
              max={appState.page.divsH} 
              value={spanH}
              size="small"
              onsl-input={(e) => update('spanH', parseInt(e.target.value) || 1)}>
            </sl-input>
          </div>
        </div>

        <div class="panel-section">
          <sl-range 
            label="Internal Padding (%)" 
            min="0" 
            max="48" 
            value={padding}
            onsl-change={(e) => update('padding', parseInt(e.target.value) || 0)}>
          </sl-range>
        </div>

        <div class="panel-section" style="margin-top: 0.5rem;">
          <sl-radio-group 
            size="small" 
            value={align} 
            onsl-change={(e) => update('align', e.target.value)}>
            <sl-radio-button value="start">Top-Left</sl-radio-button>
            <sl-radio-button value="center">Center</sl-radio-button>
          </sl-radio-group>
        </div>
      {/if}

    </div>
  {/if}
</div>

<style>
  .row {
    display: flex;
    gap: 0.75rem;
  }

  .row > * {
    flex: 1;
  }

  .image-preview-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    background: var(--sl-color-neutral-50);
    padding: 0.5rem;
    border-radius: var(--sl-border-radius-medium);
    border: 1px solid var(--sl-color-neutral-200);
  }

  .image-preview {
    max-width: 100%;
    max-height: 140px;
    object-fit: contain;
    border-radius: var(--sl-border-radius-small);
  }

  .clear-btn {
    width: 100%;
  }
</style>