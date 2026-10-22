<script>
  import { appState } from '$stores/appState.svelte.js';
  import { FUSION_EFFECTS } from '$lib/fusionEngine.js';
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
  import '@shoelace-style/shoelace/dist/components/badge/badge.js';
  import '@shoelace-style/shoelace/dist/components/range/range.js';
  import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/icon/icon.js';
  import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';

  // Defensive derived variable to prevent crashes if appState has stale IDs
  const activeConfigs = $derived(
    appState.effects.active
      .map(id => ({ id, config: FUSION_EFFECTS[id] }))
      .filter(item => item.config !== undefined)
  );

  const atLimit = $derived(appState.effects.active.length >= appState.maxEffects);

  // Helper to reorder the effects array
  function moveEffect(index, offset) {
    const newIndex = index + offset;
    if (newIndex < 0 || newIndex >= appState.effects.active.length) return;
    
    appState.saveState(); // Push to undo stack before reordering
    
    const newActive = [...appState.effects.active];
    const temp = newActive[index];
    newActive[index] = newActive[newIndex];
    newActive[newIndex] = temp;
    
    appState.effects.active = newActive;
  }
</script>

<div class="panel-container">
  <div class="panel-header">
    <h3>Fusion Engine</h3>
    <sl-badge variant={atLimit ? 'danger' : 'primary'} pill>
      {appState.effects.active.length} / {appState.maxEffects}
    </sl-badge>
  </div>
  
  <p class="panel-subtitle">Select up to {appState.maxEffects} effects to fuse.</p>
  
  <div class="panel-section">
    <sl-checkbox 
      size="small"
      checked={appState.textAffectedByFusion} 
      onsl-change={(e) => {
        appState.saveState();
        appState.textAffectedByFusion = e.target.checked;
      }}>
      Apply Fusion Effects to Text
    </sl-checkbox>
  </div>

  <div class="panel-section" style="margin-bottom: 1rem;">
    <sl-checkbox 
      size="small"
      checked={appState.imagesAffectedByFusion} 
      onsl-change={(e) => {
        appState.saveState();
        appState.imagesAffectedByFusion = e.target.checked;
      }}>
      Apply Fusion Effects to Images
    </sl-checkbox>
  </div>

  <sl-divider style="margin: 1rem 0;"></sl-divider>

  <div class="selector-row">
    <sl-select 
      size="small" 
      placeholder={atLimit ? "Limit reached" : "Add Effect..."} 
      disabled={atLimit}
      onsl-change={(e) => {
        appState.toggleEffect(e.target.value);
        e.target.value = ""; 
      }}>
      {#each Object.entries(FUSION_EFFECTS) as [id, config]}
        <sl-option value={id} disabled={appState.effects.active.includes(id)}>
          {config.name}
        </sl-option>
      {/each}
    </sl-select>

    <sl-tooltip content="Randomize effects" placement="top">
      <sl-button size="small" circle onclick={() => appState.randomizeFusion()}>
        <sl-icon name="dice-5"></sl-icon>
      </sl-button>
    </sl-tooltip>
  </div>

  <div class="panel-stack">
    {#each activeConfigs as { id, config }, i}
      <div class="effect-card">
        <div class="card-header">
          <label>{config.name}</label>
          <div class="card-actions">
            <sl-icon-button 
              name="chevron-up" 
              class="order-btn" 
              disabled={i === 0} 
              onclick={() => moveEffect(i, -1)}
              title="Move Up">
            </sl-icon-button>
            <sl-icon-button 
              name="chevron-down" 
              class="order-btn" 
              disabled={i === activeConfigs.length - 1} 
              onclick={() => moveEffect(i, 1)}
              title="Move Down">
            </sl-icon-button>
            <sl-icon-button 
              name="x-lg" 
              class="remove-btn" 
              onclick={() => appState.toggleEffect(id)}
              title="Remove Effect">
            </sl-icon-button>
          </div>
        </div>

        {#if !config.isToggle}
          <div class="label-row">
            <span class="val">{appState.effects.values[id]}{config.unit}</span>
          </div>
          <sl-range 
            min={config.min} max={config.max} step={config.step}
            value={appState.effects.values[id]}
            onpointerdown={() => appState.saveState(true)}
            onsl-input={(e) => appState.updateEffectValue(id, parseFloat(e.target.value))}
          >
          </sl-range>
        {:else}
          <div class="label-row">
            <span class="status-badge">Active</span>
          </div>
        {/if}
      </div>
    {:else}
      <div class="panel-empty">
        <p>No effects active. Choose one above to start fusing.</p>
      </div>
    {/each}
  </div>
</div>

<style>
  .selector-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1.5rem; 
  }

  .selector-row sl-select {
    flex: 1; 
  }

  .effect-card { 
    background: var(--sl-color-neutral-50); 
    padding: 0.75rem; 
    border-radius: var(--sl-border-radius-medium);
    border: 1px solid var(--sl-color-neutral-200);
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .card-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-bottom: 0.5rem; 
  }

  .card-header label { 
    font-size: 0.7rem; 
    font-weight: 800; 
    text-transform: uppercase;
    color: var(--sl-color-neutral-600);
  }

  /* Keep the action buttons grouped and tidy */
  .card-actions {
    display: flex;
    align-items: center;
    gap: 0.1rem;
  }

  .order-btn::part(base),
  .remove-btn::part(base) {
    padding: 0;
    font-size: 0.8rem;
    color: var(--sl-color-neutral-500);
  }

  .order-btn:hover::part(base),
  .remove-btn:hover::part(base) {
    color: var(--sl-color-primary-600);
  }

  .remove-btn::part(base) {
    margin-left: 0.25rem;
  }

  .label-row {
    margin-bottom: 0.25rem;
  }

  .val { 
    font-size: 0.8rem; 
    font-family: var(--sl-font-mono);
    color: var(--sl-color-primary-600); 
    font-weight: 600;
  }

  .status-badge {
    font-size: 0.7rem;
    background: var(--sl-color-primary-100);
    color: var(--sl-color-primary-700);
    padding: 0.1rem 0.4rem;
    border-radius: var(--sl-border-radius-small);
    font-weight: 700;
    text-transform: uppercase;
  }
</style>