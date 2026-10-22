import { generateSong } from '../composer/generator.js';
import { initInstruments, scheduleSong, play, pause, stop } from '../audio/engine.js';
import { encodeExport, encodeTestKit } from './export-service.js';
import { saveFile } from '../utils/save.js';

export const appState = $state({
  style: "action",
  playbackState: "intro",
  isPlaying: false,
  isPaused: false,
  hasGenerated: false,

  msg: "ready to generate",
  timer: "00:00",
  exportElapsed: "",

  // Discrete progress
  playingStructure: 0,
  totalStructures: 0,

  currentSong: null,
  
  // Global popup state
  popupState: undefined 
});

function formatElapsed(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

let exportToken = 0;

async function performExport(label, encode) {
  if (appState.playbackState === "recording") return false;

  const token = ++exportToken;
  let exportSucceeded = false;
  const wasPlaying = appState.isPlaying;
  const restoreSong = appState.currentSong;
  if (wasPlaying) appActions.stop();

  appState.popupState = undefined;
  appState.playbackState = "recording";
  appState.msg = `exporting ${label}...`;

  const startedAt = Date.now();
  appState.exportElapsed = "00:00";
  const ticker = setInterval(() => {
    appState.exportElapsed = formatElapsed(Date.now() - startedAt);
  }, 250);

  try {
    const { data, filename, binary } = await encode();

    if (appState.playbackState !== "recording") {
      throw new Error("Export cancelled by user");
    }

    const success = await saveFile(filename, data, binary);

    if (success) {
      appState.msg = "export successful";
      exportSucceeded = true;
    } else {
      appState.msg = "export cancelled";
    }
  } catch (err) {
    console.error(err);

    if (err.message === "Export cancelled by user") {
      appState.msg = "export cancelled";
    } else {
      appState.msg = "export error";
    }

    return false;
  } finally {
    clearInterval(ticker);
    setTimeout(async () => {
      appState.exportElapsed = "";
      if (token !== exportToken || appState.currentSong !== restoreSong) return;

      const shouldResume = wasPlaying && appState.playbackState === "recording";
      if (shouldResume && restoreSong) {
        try {
          await initInstruments(restoreSong);
          scheduleSong(restoreSong, () => appActions.stop());
          appActions.play();
        } catch (err) {
          console.error(err);
          appState.playbackState = "intro";
          appState.msg = "stopped";
        }
      } else {
        appState.playbackState = "intro";
        appState.msg = "stopped";
      }

      // Show the success dialog only after the recording overlay has cleared,
      // so its text cannot sit on top of the previous illustration/recorder.
      if (exportSucceeded) appState.popupState = "export";
    }, 1000);
  }
}

export const appActions = {
  async generate() {
    if (appState.playbackState === "recording") return;

    appState.msg = "generating...";
    appState.hasGenerated = true;
    appState.playbackState = "playing";

    appState.currentSong = generateSong(appState.style);

    appState.totalStructures = appState.currentSong.meta.unrolledStructure.length;
    appState.playingStructure = 0;

    await initInstruments(appState.currentSong);

    scheduleSong(appState.currentSong, () => {
      appActions.stop();
    });

    appActions.play();
  },

  play() {
    appState.isPlaying = true;
    appState.isPaused = false;
    appState.playbackState = "playing";
    appState.msg = "playing";
    play();
  },

  pause() {
    appState.isPlaying = false;
    appState.isPaused = true;
    appState.msg = "paused";
    pause();
  },

  stop() {
    stop();

    appState.isPlaying = false;
    appState.isPaused = false;
    appState.playbackState = "intro";
    appState.msg = "stopped";
    appState.timer = "00:00";
    appState.playingStructure = 0;
  },

  startExport(format) {
    if (!appState.currentSong && format !== 'license' && format !== 'sfx') return;
    return performExport(format, () => encodeExport(format, appState.currentSong));
  },

  startTestKit(includeWav = false) {
    if (!appState.currentSong) return;
    return performExport("test kit", () => encodeTestKit(appState.currentSong, { includeWav }));
  }
};