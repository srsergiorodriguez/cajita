<script>
  import { appState, appActions } from '../state/store.svelte.js';
  import { getPlaybackState } from '../audio/engine.js';

  const busy = $derived(appState.playbackState === "recording");

  function handleGenerate() {
    if (busy) return;
    appActions.generate();
  }

  $effect(() => {
    let raf;
    function updateFrame() {
      if (!appState.isPlaying) return;

      const { currentMeasure, timeStr } = getPlaybackState();
      appState.playingStructure = currentMeasure;
      appState.timer = timeStr;
      
      raf = requestAnimationFrame(updateFrame);
    }
    
    if (appState.isPlaying) {
      raf = requestAnimationFrame(updateFrame);
    }
    
    return () => cancelAnimationFrame(raf);
  });
</script>

<div class="controls-container" aria-busy={busy}>
  {#if appState.hasGenerated}
    <div class="progressbar">
      <span class="timer-text">{appState.timer}</span>
      {#each Array(appState.totalStructures || 0).fill(0) as _, i}
        <span class={`progressslot ${appState.playingStructure >= i ? "completed" : ""}`}></span>
      {/each}
    </div>
  {/if}

  <div class="gui">
    <div class="list-radio" role="radiogroup" aria-label="style">
      <label><input type="radio" bind:group={appState.style} value="action" disabled={busy}> action</label>
      <label><input type="radio" bind:group={appState.style} value="party" disabled={busy}> party</label>
      <label><input type="radio" bind:group={appState.style} value="chill" disabled={busy}> chill</label>
    </div>

    <div class="list">
      <button class="btn-generate" onclick={handleGenerate} disabled={busy}>generate</button>
      
      {#if appState.hasGenerated}
        <div class="transport-controls" role="group" aria-label="transport">
          {#if appState.isPlaying}
            <button onclick={appActions.pause} disabled={busy}>pause</button>
          {:else}
            <button onclick={appActions.play} disabled={busy}>play</button>
          {/if}
          <button onclick={appActions.stop} disabled={busy}>stop</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .controls-container {
    display: grid;
    grid-gap: var(--space-3);
  }

  .progressbar {
    display: flex;
    width: 100%;
    background: var(--paper);
    height: var(--progress-height);
    overflow: hidden;
  }

  .timer-text {
    display: flex;
    align-items: center;
    padding: 0 calc(var(--space-2) + var(--space-1));
    font-size: var(--text-md);
    border-right: 1px solid var(--ink);
    background: var(--paper);
    font-variant-numeric: tabular-nums;
  }

  .progressslot {
    flex-grow: 1; 
    height: 100%;
    border-right: 1px solid var(--ink);
  }

  .progressslot:last-child {
    border-right: none;
  }

  .progressslot.completed {
    background: var(--ink);
  }

  .gui {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: var(--space-3);
    height: var(--control-height); /* Lock height to align with radio buttons */
  }

  /* Flexbox automatically handles filling the vertical space */
  .list {
    display: flex;
    flex-direction: column;
    grid-gap: var(--space-1);
    height: 100%;
  }

  .btn-generate {
    flex-grow: 1; /* Stretches to fill available space */
  }

  .transport-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: var(--space-1);
    flex-grow: 1; /* Shares space equally with the generate button */
  }

  .transport-controls button {
    height: 100%;
  }

  /* Custom Black and White Radio Buttons */
  .list-radio {
    display: grid;
    grid-gap: var(--space-1);
    grid-template-rows: 1fr 1fr 1fr;
    height: var(--control-height);
  }

  .list-radio label {
    display: flex;
    align-items: center;
    gap: calc(var(--space-2) + var(--space-1));
    cursor: pointer;
  }

  input[type="radio"] {
    /* Strip default browser styling */
    appearance: none;
    -webkit-appearance: none;
    
    /* Rebuild the outer circle */
    width: 14px;
    height: 14px;
    border: 1.5px solid var(--ink);
    border-radius: 50%;
    background-color: var(--paper);
    display: grid;
    place-content: center;
    margin: 0;
    cursor: pointer;
  }

  /* Build the inner dot */
  input[type="radio"]::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--ink);
    transform: scale(0);
    transition: 120ms transform ease-in-out;
  }

  input[type="radio"]:checked::before {
    transform: scale(1); /* Reveal the dot when selected */
  }

  input[type="radio"]:disabled {
    border-style: dotted;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    input[type="radio"]::before {
      transition: none;
    }
  }
</style>