<script>
  import { onMount } from 'svelte';
  import { appState, SHAPE_PACKS, VERSION } from '$stores/appState.svelte.js';
  import { save, open } from '@tauri-apps/plugin-dialog';
  import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
  import { getVersion } from '@tauri-apps/api/app'; 

  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/button-group/button-group.js';
  import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
  import '@shoelace-style/shoelace/dist/components/menu/menu.js';
  import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
  import '@shoelace-style/shoelace/dist/components/divider/divider.js';
  import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import '@shoelace-style/shoelace/dist/components/details/details.js';
  import '@shoelace-style/shoelace/dist/components/alert/alert.js';
  import '@shoelace-style/shoelace/dist/components/icon/icon.js';

  import instructionsData from '$lib/instructions.json';
  import licensesData from '$lib/licenses.json';

  const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  let isMac = $state(true);
  let showAbout = $state(false);
  let showInstructions = $state(false);
  let showLicense = $state(false); 
  let appVersion = $state("..."); 

  onMount(async () => {
    isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    if (isDesktop) {
      try {
        appVersion = await getVersion();
      } catch (e) {
        console.warn("Could not fetch app version from Tauri.");
        appVersion = VERSION;
      }
    } else {
      appVersion = `${VERSION} (Web)`;
    }
  });

  const mod = $derived(isMac ? '⌘ ' : 'Ctrl+');

  function handleNew() { 
    appState.clearGrid(); 
    showToast('New canvas created');
  }

  function handleNewRandom() {
    appState.generateRandomGrid();
    showToast('Random canvas generated!');
  }

  async function handleOpen() {
    if (isDesktop) {
      const filePath = await open({
        title: 'Open Motivo Composition',
        multiple: false,
        filters: [{ name: 'Motivo Project', extensions: ['motivo', 'json'] }]
      });
      if (filePath) {
        const contents = await readTextFile(filePath);
        appState.loadProjectJSON(contents);
        appState.currentFilePath = filePath; // Track the path
        showToast('Project loaded!');
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.motivo,.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          appState.loadProjectJSON(event.target.result);
          showToast('Project loaded!');
        };
        reader.readAsText(file);
      };
      input.click();
    }
  }

  // standard Save function
  async function handleSave() {
    if (isDesktop && appState.currentFilePath) {
      const projectData = appState.getProjectJSON();
      await writeTextFile(appState.currentFilePath, projectData);
      showToast('Project saved!');
    } else {
      // If no file path exists yet (or we are on the Web), fallback to Save As
      await handleSaveAs();
    }
  }

  async function handleSaveAs() {
    // If we have a path, suggest that filename, otherwise use a timestamp
    const defaultName = appState.currentFilePath 
      ? appState.currentFilePath.split(/[\\/]/).pop() 
      : `composition_${Date.now()}.motivo`;
      
    const projectData = appState.getProjectJSON();
    
    if (isDesktop) {
      const filePath = await save({
        title: 'Save Motivo Composition As',
        defaultPath: defaultName,
        filters: [{ name: 'Motivo Project', extensions: ['motivo', 'json'] }]
      });
      if (filePath) {
        await writeTextFile(filePath, projectData);
        appState.currentFilePath = filePath; // Track the new path
        showToast('Project saved!');
      }
    } else {
      const element = document.createElement('a');
      const blob = new Blob([projectData], { type: 'application/json' });
      element.setAttribute('href', URL.createObjectURL(blob));
      element.setAttribute('download', defaultName);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showToast('Project downloaded!');
    }
  }

  function handleMenuKeydown(event) {
    const isMod = event.metaKey || event.ctrlKey;
    if (isMod && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (event.shiftKey) {
        handleSaveAs();
      } else {
        handleSave();
      }
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

  function toggleFullScreen() {
    if (isDesktop) return; 

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Could not enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
</script>

<svelte:window onkeydown={handleMenuKeydown} />

<div class="main-menu-container">
  <div class="menu-flex-wrapper">
    <sl-button-group class="menu-bar" label="Main menu">
      <sl-dropdown>
        <sl-button slot="trigger" size="small" class="menu-trigger">File</sl-button>
        <sl-menu>
          <sl-menu-item onclick={handleNew}>
            New Blank
            <span slot="suffix" class="shortcut">{mod}N</span>
          </sl-menu-item>
          <sl-menu-item onclick={handleNewRandom}>
            New Random
            <span slot="suffix" class="shortcut">{mod}R</span>
          </sl-menu-item>
          <sl-menu-item onclick={handleOpen}>
            Open...
          </sl-menu-item>
          <sl-divider></sl-divider>
          <sl-menu-item onclick={handleSave}>
            Save
            <span slot="suffix" class="shortcut">{mod}S</span>
          </sl-menu-item>
          
          <sl-menu-item onclick={handleSaveAs}>
            Save as...
            <span slot="suffix" class="shortcut">⇧{mod}S</span>
          </sl-menu-item>
        </sl-menu>
      </sl-dropdown>
      
      <sl-dropdown>
        <sl-button slot="trigger" size="small" class="menu-trigger">Edit</sl-button>
        <sl-menu>
          <sl-menu-item disabled={appState.undoStack.length === 0} onclick={() => appState.undo()}>
            Undo <span slot="suffix" class="shortcut">{mod}Z</span>
          </sl-menu-item>
          <sl-menu-item disabled={appState.redoStack.length === 0} onclick={() => appState.redo()}>
            Redo <span slot="suffix" class="shortcut">{mod}Y</span>
          </sl-menu-item>
          <sl-divider></sl-divider>
          <sl-menu-item disabled={appState.selectedCells.length === 0} onclick={() => appState.copySelectedCell()}>
            Copy <span slot="suffix" class="shortcut">{mod}C</span>
          </sl-menu-item>
          <sl-menu-item disabled={!appState.copiedBlock} onclick={() => appState.pasteToSelectedCell()}>
            Paste <span slot="suffix" class="shortcut">{mod}V</span>
          </sl-menu-item>
        </sl-menu>
      </sl-dropdown>

      <sl-dropdown>
        <sl-button slot="trigger" size="small" class="menu-trigger">View</sl-button>
        <sl-menu>
          <sl-menu-item 
            type="checkbox" 
            checked={appState.showGrid} 
            onclick={() => appState.toggleGrid()}>
            Show Grid Lines
            <span slot="suffix" class="shortcut">{mod}G</span>
          </sl-menu-item>

          {#if !isDesktop}
            <sl-menu-item onclick={toggleFullScreen}>
              Toggle Fullscreen
            </sl-menu-item>
          {/if}
        </sl-menu>

      </sl-dropdown>

      {#if isDesktop}
        <sl-dropdown>
          <sl-button slot="trigger" size="small" class="menu-trigger">Extras</sl-button>
          <sl-menu>
            <sl-menu-item>
              Shape Packs
              <sl-menu slot="submenu">
                {#each Object.entries(SHAPE_PACKS) as [packKey, packData]}
                  <sl-menu-item 
                    type="checkbox" 
                    checked={appState.shapePack === packKey} 
                    onclick={() => appState.setShapePack(packKey)}>
                    {packData.name}
                    {#if packKey !== 'standard'}
                      <sl-icon slot="suffix" name="stars"></sl-icon>
                    {/if}
                  </sl-menu-item>
                {/each}
              </sl-menu>
            </sl-menu-item>
          </sl-menu>
        </sl-dropdown>
      {/if}

      <sl-dropdown>
        <sl-button slot="trigger" size="small" class="menu-trigger">Help</sl-button>
        <sl-menu>
          <sl-menu-item onclick={() => showInstructions = true}>Instructions</sl-menu-item>
          <sl-divider></sl-divider>
          <sl-menu-item onclick={() => showAbout = true}>About motivomotivo</sl-menu-item>
          <sl-menu-item onclick={() => showLicense = true}>License & Legal</sl-menu-item>
        </sl-menu>
      </sl-dropdown>
    </sl-button-group>

    {#if !isDesktop}
      <sl-button 
        size="small" 
        variant="primary" 
        pill 
        class="support-badge" 
        href="https://srsergior.itch.io/motivomotivo" 
        target="_blank">
        <sl-icon slot="prefix" name="stars"></sl-icon>
        Support this project
      </sl-button>
    {/if}
  </div>
</div>

<sl-dialog label="About motivomotivo" open={showAbout} onsl-after-hide={() => showAbout = false}>
  <div class="about-content">
    <h3>motivomotivo v{appVersion}</h3>
    <p>motivomotivo is a project by Sergio Rodríguez Gómez exploring creativity through constraints. The web version is free for everyone. If you enjoy this tool, consider supporting its development by purchasing the Desktop Edition, which includes extra shape packs and palette templates.</p>
  </div>
</sl-dialog>

<sl-dialog label="User Manual" open={showInstructions} onsl-after-hide={() => showInstructions = false} style="--width: 650px;">
  <div class="modal-body-content">
    {#each Object.entries(instructionsData) as [section, content]}
      <div class="text-block">
        <h4>{section}</h4>
        <p>{content.text}</p>
        
        {#if content.image}
          <div class="instruction-image-container">
            <img src={content.image} alt="{section} screenshot" loading="lazy" />
          </div>
        {/if}
      </div>
    {/each}
  </div>
</sl-dialog>

<sl-dialog label="License & Legal" open={showLicense} onsl-after-hide={(e) => { if (e.target === e.currentTarget) showLicense = false; }} style="--width: 600px;">
  <div class="modal-body-content legal-content">
    <sl-details summary="End-User License Agreement (EULA)">
      <div class="legal-text" style="white-space: pre-wrap;">
        {licensesData.eula}
      </div>
    </sl-details>
    <sl-divider style="margin: 1rem 0;"></sl-divider>
    <h4 class="third-party-header">Third-Party Open Source Licenses</h4>
    <p class="third-party-sub">motivomotivo is made possible thanks to the following open-source technologies and fonts:</p>
    {#each licensesData.thirdParty as item}
      <sl-details summary="{item.component} ({item.licenseName})">
        <div class="legal-text" style="white-space: pre-wrap;">
          {item.text}
        </div>
      </sl-details>
    {/each}
  </div>
  <sl-button slot="footer" variant="primary" onclick={() => showLicense = false}>Close</sl-button>
</sl-dialog>

<style>
  .main-menu-container {
    padding: 2px 4px;
    background: var(--sl-color-neutral-0);
    border-bottom: 1px solid var(--sl-color-neutral-200);
  }

  .menu-flex-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .support-badge::part(base) {
    font-size: 0.75rem;
    height: 1.6rem;
    padding: 0 0.75rem;
  }

  .about-content h3 {
    margin-top: 0;
    font-family: var(--sl-font-sans);
  }

  .about-content p {
    font-size: 0.9rem;
    line-height: 1.4;
    color: var(--sl-color-neutral-700);
  }

  .modal-body-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 0.5rem;
    color: var(--sl-color-neutral-700);
  }

  .text-block h4 {
    margin: 0 0 0.25rem 0;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sl-color-primary-600);
  }

  .text-block p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: 1.5rem;
  }

  .legal-text {
    font-size: 0.8rem;
    font-family: var(--sl-font-mono); 
    color: var(--sl-color-neutral-600);
    line-height: 1.4;
  }

  .third-party-header {
    margin: 0 0 0.25rem 0;
    font-size: 0.85rem;
  }

  .third-party-sub {
    font-size: 0.8rem;
    color: var(--sl-color-neutral-500);
    margin: 0 0 1rem 0;
  }

  :global(sl-menu-item) { --sl-font-size-small: 0.8rem; }
  :global(sl-menu-item::part(base)) { min-height: 1.6rem !important; padding: 4px 12px !important; }
  :global(sl-menu-item::part(label)) { font-size: 0.8rem; }
  
  .menu-trigger::part(base) {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    font-weight: 500;
  }

  .menu-trigger:hover::part(base) { background-color: var(--sl-color-neutral-100) !important; }
  .shortcut { font-size: 0.75rem; color: var(--sl-color-neutral-400); margin-left: 1.5rem; }

  .instruction-image-container {
    display: flex;
    justify-content: center;
    margin: 1rem 0 1.5rem 0;
    padding: 0.5rem;
    background: var(--sl-color-neutral-50);
    border-radius: var(--sl-border-radius-medium);
    border: 1px solid var(--sl-color-neutral-200);
  }

  .instruction-image-container img {
    max-width: 100%;
    max-height: 320px; /* Keeps tall screenshots from dominating the screen */
    object-fit: contain;
    border-radius: var(--sl-border-radius-small);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
</style>