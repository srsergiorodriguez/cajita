<script>
  import { onMount } from 'svelte';
  import Popup from '$components/Popup.svelte';
  import { appState, appActions } from '../state/store.svelte.js';
  import pkg from '../../package.json';
  
  let alertContent = $state("");
  let testKitVisible = $state(false);
  let popupTrigger = $state(null);

  const popupLabels = {
    about: "about",
    instructions: "instructions",
    testkit: "test kit",
    license: "license",
    alert: "notice",
    export: "exported"
  };

  onMount(() => {
    const held = new Set();
    const combo = ["q", "w", "e"];

    function onKeyDown(event) {
      if (event.repeat) return;
      held.add(event.key.toLowerCase());
      if (combo.every(key => held.has(key))) testKitVisible = true;
    }

    function onKeyUp(event) {
      held.delete(event.key.toLowerCase());
    }

    function onBlur() {
      held.clear();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  });

  function openPopup(name, event) {
    popupTrigger = event?.currentTarget ?? null;
    appState.popupState = name;
  }

  function handleExport(e, format) {
    e.stopPropagation(); 
    appActions.startExport(format);
  }

  $effect(() => {
    if (window.api && window.api.receiveAlert) {
      window.api.receiveAlert((msg) => {
        alertContent = msg;
        appState.popupState = "alert";
      });
    }
  });
</script>

<footer class="no-select">
  <button class="link-button" onclick={(event) => openPopup('about', event)}>about</button> -
  <button class="link-button" onclick={(event) => openPopup('instructions', event)}>instructions</button> -
  <button class="link-button" onclick={(event) => openPopup('license', event)}>license</button>
  {#if testKitVisible}
    -
    <button class="link-button" onclick={(event) => openPopup('testkit', event)}>test kit</button>
  {/if}
</footer>

{#if appState.popupState}
  <Popup label={popupLabels[appState.popupState] ?? "bebop"} returnFocus={popupTrigger}>
    
    {#if appState.popupState === "about"}
      <h1>about</h1>
      <h3>bebop - a music generator for video and videogames</h3>
      <p>v{pkg.version}</p>
      <p>by Sergio R. G. — 2026</p>

    {:else if appState.popupState === "instructions"}
      <h1>instructions</h1>
      <ol>
        <li>Select the style of the song</li>
        <li>Press generate</li>
        <li>If you want, press generate again to get a new composition</li>
        <li>When you are happy with your song, download a wav or midi file, or export for pico-8 and picotron</li>
        <li>Use the downloaded audio in your game or project, edit the midi in a daw, or drop the code into your engine!</li>
        <li>For picotron, download the <strong>picotron</strong> package. It contains one <code>bebop_song.sfx</code>, the runtime player, base instruments, and instructions. Put the bank at <code>sfx/0.sfx</code> and call <code>music(0)</code>, or load it at a separate address with <code>fetch("sfx/bebop_song.sfx"):poke(0x80000)</code> then <code>music(0, nil, nil, 0x80000)</code>. Include an empty <code>_update()</code>.</li>
      </ol>
      <span><strong>Note for picotron:</strong> you can download our base instruments to get started instantly!</span>
      <div class="export-container">
        <button class="link-button" onclick={(e) => handleExport(e, "sfx")}>
          DOWNLOAD BASE SFX
        </button>
      </div>

    {:else if appState.popupState === "testkit"}
      <h1>test kit</h1>
      <p>Hear the same song in PICO-8 and Picotron without copying functions.</p>
      <p>The quick kit includes a ready-to-run PICO-8 cart, a Picotron runner, the persistent <code>0.sfx</code>, MIDI, both text exports, and the song data. The full kit also renders a WAV.</p>
      <div class="test-kit-actions">
        <button onclick={() => appActions.startTestKit(false)}>quick kit</button>
        <button onclick={() => appActions.startTestKit(true)}>full kit + wav</button>
      </div>

    {:else if appState.popupState === "license"}
      <h1>license</h1>
      <p>Thank you for supporting indie development!</p>
      <p>These are the general points of the license: You are allowed to create songs with this software and use them freely in your projects. Do not sell or give away this piece of software.</p>
      
      <div class="export-container">
        <button class="link-button full-license-btn" onclick={(e) => handleExport(e, "license")}>
          GET FULL LICENSE
        </button>
      </div>

    {:else if appState.popupState === "alert"}
      <h3 class="popup-notice">Notice</h3>
      <p>{alertContent}</p>

    {:else if appState.popupState === "export"}
      <h3 class="popup-notice">Success</h3>
      <p>Exported file!</p>
    {/if}

  </Popup>
{/if}

<style>
  footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    align-self: flex-start;
    margin-bottom: var(--space-3);
  }

  .link-button {
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    font-size: var(--text-sm);
    cursor: pointer;
    padding: 0;
    text-decoration: none;
  }

  .link-button:hover {
    text-decoration: underline;
  }

  .export-container {
    margin-top: calc(var(--space-3) + var(--space-2));
    text-align: right;
  }

  /* Ensures the button inside the popup uses the popup's font size, not the footer's 0.8rem */
  .full-license-btn {
    font-size: inherit; 
  }

  .popup-notice {
    margin-top: 0;
    color: var(--ink);
  }

  .test-kit-actions {
    display: grid;
    gap: var(--space-2);
    margin-top: calc(var(--space-3) + var(--space-2));
  }
</style>