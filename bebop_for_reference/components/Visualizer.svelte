<script>
  import { onMount } from 'svelte';
  import { appState } from '../state/store.svelte.js';

  let illustrationIndex = $state(0);
  let reduceMotion = $state(false);
  let recordingReady = $state(false);

  const frames = {
    intro: ['images/intro_frame_01.png', 'images/intro_frame_02.png'],
    playing: ['images/play_frame_01.png', 'images/play_frame_02.png'],
    recording: ['images/rec_frame_01.png', 'images/rec_frame_02.png']
  };

  onMount(() => {
    for (const src of Object.values(frames).flat()) {
      const image = new Image();
      image.src = `/${src}`;
    }
  });

  $effect(() => {
    if (appState.playbackState === 'recording') illustrationIndex = 0;
  });

  $effect(() => {
    if (appState.playbackState !== 'recording') {
      recordingReady = false;
      return;
    }

    recordingReady = false;
    let cancelled = false;
    const image = new Image();
    const finish = () => {
      if (!cancelled) recordingReady = true;
    };

    image.onload = finish;
    image.onerror = finish;
    image.src = `/${frames.recording[0]}`;
    image.decode?.().then(finish).catch(finish);

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  });

  $effect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = query.matches;
    const handleChange = () => { reduceMotion = query.matches; };
    query.addEventListener?.('change', handleChange);
    return () => query.removeEventListener?.('change', handleChange);
  });

  $effect(() => {
    let frameId;
    let lastTime = performance.now();

    function animate(time) {
      if (reduceMotion) {
        illustrationIndex = 0;
        lastTime = time;
        frameId = requestAnimationFrame(animate);
        return;
      }

      let isAnimPaused = false;
      let interval = 500; // Default 2 FPS (1000ms / 2) for intro/recording

      // If we have a song and are in the playing state, calculate the BPM interval
      if (appState.playbackState === 'playing') {
        if (!appState.isPlaying) {
          // Freeze the animation if playback is paused
          isAnimPaused = true;
        } else if (appState.currentSong) {
          // 60,000 ms divided by BPM gives us the exact duration of one beat
          const bpm = appState.currentSong.meta.bpm;
          const speedMultiplier = 2;
          interval = (60000 / bpm) / speedMultiplier; 
        }
      }

      if (isAnimPaused) {
        // Keep the timer completely synced so it doesn't skip a frame when unpaused
        lastTime = time;
      } else {
        if (time - lastTime >= interval) {
          const currentFrames = frames[appState.playbackState] ?? frames.intro;
          illustrationIndex = (illustrationIndex + 1) % currentFrames.length;
          
          // If the browser tab was hidden, prevent rapid-fire catch-up frames
          if (time - lastTime > interval * 2) {
            lastTime = time;
          } else {
            lastTime += interval;
          }
        }
      }
      
      frameId = requestAnimationFrame(animate);
    }

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  });
</script>

<div class="visualizer-container">
  {#if appState.playbackState === "recording" && recordingReady}
    <div class="recording-overlay">
      <span class="blinking-text">THE BAND IS RECORDING</span>
      <span class="blinking-text">(this might take a minute)</span>
      {#if appState.exportElapsed}
        <span class="blinking-text">{appState.exportElapsed}</span>
      {/if}
    </div>
  {/if}

  <div class="visualizer no-select">
    <div class="screen">
      <img 
        src="/{(frames[appState.playbackState] ?? frames.intro)[illustrationIndex]}"
        alt="bebop visualizer"
        class="illustration"
      />
    </div>
  </div>
</div>

<style>
  .visualizer {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--paper);
    overflow: hidden;
    position: relative;
  }

  .screen {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .illustration {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .recording-overlay {
    position: absolute;
    left: 0;
    top: calc(-1 * var(--space-3));
    width: 100%;
    padding: var(--space-5);
    text-align: center;
    pointer-events: none; /* Ensures the text doesn't block mouse clicks */
    z-index: 10;
    background: none;
    border: none;
  }

  .blinking-text {
    display: block;
    font-size: var(--text-xs);
    color: var(--ink);
  }
</style>