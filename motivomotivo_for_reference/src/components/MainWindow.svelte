<script>
  import { onMount } from 'svelte';
  import { setMenu } from '$lib/menu.js';

  // --- UI Components ---
  import MainMenu from "$components/MainMenu.svelte";
  import MotivoBar from "$components/MotivoBar.svelte"; 
  import TextBar from "$components/TextBar.svelte";
  import ImageBar from './ImageBar.svelte';
  import ProjectBar from "$components/ProjectBar.svelte";
  import PostProcessingBar from "$components/PostProcessingBar.svelte";
  import BatchBar from "$components/BatchBar.svelte";
  import CompositionView from "$components/CompositionView.svelte";
  import FusionView from "$components/FusionView.svelte";

  // --- Shoelace Layout Components ---
  import '@shoelace-style/shoelace/dist/components/split-panel/split-panel.js';
  import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
  import '@shoelace-style/shoelace/dist/components/tab/tab.js';
  import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
  import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import '@shoelace-style/shoelace/dist/components/button/button.js';

  // --- State & API ---
  import { appState, VERSION } from "$stores/appState.svelte.js";
  import { getVersion } from '@tauri-apps/api/app';

  const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  // UI State
  let activeView = $state("composition");
  let currentSidebarTab = $state("project");
  let lastCompTab = $state("project");
  let showSplash = $state(false);
  let appVersion = $state("...");

  onMount(async () => {
    if (isDesktop) {
      await setMenu();
    }
    // Show splash on entry
    showSplash = true;

    if (isDesktop) {
      try {
        appVersion = await getVersion();
      } catch (e) {
        appVersion = VERSION;
      }
    } else {
      appVersion = `${VERSION} (Web)`;
    }
  });

  // --- Global Keyboard Shortcuts ---
  function handleKeydown(event) {
    if (event.target.closest('sl-input, sl-textarea, input, textarea')) return;

    const isMod = event.metaKey || event.ctrlKey;

    if (isMod && event.key === 'z') {
      event.preventDefault();
      if (event.shiftKey) appState.redo();
      else appState.undo();
    }
    if (isMod && event.key === 'y') {
      event.preventDefault();
      appState.redo();
    }
    if (isMod && event.key === 'c') {
      event.preventDefault();
      appState.copySelectedCell();
    }
    if (isMod && event.key === 'v') {
      event.preventDefault();
      appState.pasteToSelectedCell();
    }
    if (isMod && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      appState.generateRandomGrid();
    }
    if (isMod && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      appState.clearGrid(); 
    }
    if (isMod && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      appState.toggleGrid();
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      if (appState.selectedCells.length > 0) {
        event.preventDefault();
        appState.clearEntireCell();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="general-container">
  
  <MainMenu />
  
  <div class="workspace-container">
    <sl-split-panel class="split-panel" primary="end" position-in-pixels=350 >
      
      <div class="split-panel-section" slot="start">
        <sl-tab-group 
          class="full-height-tabs" 
          onsl-tab-show={(e) => {
            activeView = e.detail.name;
            
            // The Logic: When switching views, if they AREN'T on the Project tab, swap to the correct tool.
            if (activeView === 'composition' && currentSidebarTab !== 'project') {
              currentSidebarTab = lastCompTab;
            } else if (activeView === 'fusion' && currentSidebarTab !== 'project') {
              currentSidebarTab = 'post';
            }
          }}>
          
          <sl-tab slot="nav" panel="composition" active={activeView === 'composition'}>Composition</sl-tab>
          <sl-tab slot="nav" panel="fusion" active={activeView === 'fusion'}>Fusion</sl-tab>

          <sl-tab-panel name="composition">
            <CompositionView />
          </sl-tab-panel>
          
          <sl-tab-panel name="fusion">
            <FusionView />
          </sl-tab-panel>
        </sl-tab-group>
      </div>

      <div class="split-panel-section" slot="end">
        <sl-tab-group 
          class="full-height-tabs"
          onsl-tab-show={(e) => {
            currentSidebarTab = e.detail.name;
            // Memorize the composition tool if they clicked Motivo or Text
            if (['motivo', 'text'].includes(currentSidebarTab)) {
              lastCompTab = currentSidebarTab;
            }
            appState.showBatchOverlay = (currentSidebarTab === 'batch');
          }}
        >

        <sl-tab slot="nav" panel="project" active={currentSidebarTab === 'project'}>Project</sl-tab>
        <sl-tab-panel name="project">
          <ProjectBar />
        </sl-tab-panel>

          {#if activeView === 'composition'}
            <sl-tab slot="nav" panel="motivo" active={currentSidebarTab === 'motivo'}>Motivo</sl-tab>
            <sl-tab-panel name="motivo">
              <MotivoBar />
            </sl-tab-panel>

            <sl-tab slot="nav" panel="text" active={currentSidebarTab === 'text'}>Text</sl-tab>
            <sl-tab-panel name="text">
              <TextBar />
            </sl-tab-panel>

            <sl-tab slot="nav" panel="image">Image</sl-tab>
            <sl-tab-panel name="image">
              <ImageBar />
            </sl-tab-panel>

          {:else if activeView === 'fusion'}
            <sl-tab slot="nav" panel="post" active={currentSidebarTab === 'post'}>Post-Processing</sl-tab>
            <sl-tab-panel name="post">
              <PostProcessingBar />
            </sl-tab-panel>
          {/if}

          <sl-tab slot="nav" panel="batch" active={currentSidebarTab === 'batch'}>Batch</sl-tab>
          <sl-tab-panel name="batch">
            <BatchBar />
          </sl-tab-panel>

        </sl-tab-group>
      </div>

    </sl-split-panel>
  </div>
</div>

<sl-dialog no-header open={showSplash} onsl-after-hide={() => showSplash = false} style="--width: 550px;">
  <div class="splash-wrapper">
    <div class="splash-media">
      <img src="./splash_motivomotivo.png" alt="motivomotivo artwork" />
    </div>
    
    <div class="splash-info">
      <h1 class="brand-title">motivomotivo</h1>
      <p class="brand-motto">Creativity through constraints.</p>
      
      <div class="splash-meta">
        <span class="version-tag">Version {appVersion}</span>
        <span class="author-tag">By Sergio R. G.</span>
      </div>

      <sl-button variant="primary" size="medium" pill onclick={() => showSplash = false} class="start-btn">
        Start Designing
      </sl-button>
    </div>
  </div>
</sl-dialog>

<style>
  /* Base Container Structuring */
  .general-container {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--sl-color-neutral-50);
  }

  .workspace-container {
    box-sizing: border-box;
    display: flex;
    flex: 1;
    gap: 0.5rem;
    padding: 0.5rem;
    min-height: 0;
  }

  .split-panel {
    flex: 1;
    min-height: 0;
  }

  .split-panel-section {
    box-sizing: border-box;
    background: var(--sl-color-neutral-0);
    height: 100%;
    display: flex;
    flex-direction: column;
    border: solid 1px var(--sl-color-neutral-300);
    overflow: hidden;
  }

  .full-height-tabs {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .full-height-tabs::part(base) { height: 100%; display: flex; flex-direction: column; }
  .full-height-tabs::part(body) { flex: 1; display: flex; flex-direction: column; min-height: 0; }

  :global(sl-tab-panel) { height: 100%; }
  :global(sl-tab-panel::part(base)) { height: 100%; display: flex; flex-direction: column; padding: 0; }

  /* SPLASH STYLES */
  .splash-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding-bottom: 1rem;
  }

  .splash-media {
    width: 100%;
    /* aspect-ratio: 16/9; */
    background: var(--sl-color-neutral-100);
    border-radius: var(--sl-border-radius-medium);
    overflow: hidden;
    margin-bottom: 1.5rem;
    border: 1px solid var(--sl-color-neutral-200);
  }

  .splash-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .brand-title {
    font-size: 2.25rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.03em;
    color: var(--sl-color-neutral-900);
  }

  .brand-motto {
    font-size: 1.1rem;
    color: var(--sl-color-primary-600);
    margin: 0.25rem 0 1.5rem 0;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: lowercase;
  }

  .brand-motto {
    font-size: 1.1rem;
    /* Apply the gradient to the text! */
    background: var(--motivo-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    
    margin: 0.25rem 0 1.5rem 0;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: lowercase;
  }

  .splash-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 2rem;
  }

  .version-tag {
    font-size: 0.75rem;
    font-family: var(--sl-font-mono);
    color: var(--sl-color-neutral-400);
  }

  .author-tag {
    font-size: 0.85rem;
    color: var(--sl-color-neutral-600);
    font-weight: 500;
  }

  .start-btn {
    width: 200px;
  }
</style>