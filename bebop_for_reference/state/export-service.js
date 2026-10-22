import { renderOffline } from "../audio/engine.js";
import { audioBufferToWav } from "../exporters/wav.js";
import { exportMidi } from "../exporters/midi.js";
import { exportPico8 } from "../exporters/pico8.js";
import { buildPicotronBank, encodePicotronBankSfx } from "../exporters/picotron-bank.js";
import { buildPicotronPackage } from "../exporters/picotron-bundle.js";
import { buildSongEvents } from "../domain/events.js";
import { getLicenseText } from "../exporters/license.js";
import { buildTestKit } from "../exporters/test-kit.js";
import { getFormat } from "../exporters/formats.js";

/**
 * Encode one export format. This is the only place that knows how WAV, SFX,
 * license, and the pure text/binary exporters are assembled.
 *
 * @param {string} format
 * @param {object|null} song
 * @returns {Promise<{data: ArrayBuffer|Uint8Array|string, filename: string, binary: boolean}>}
 */
export async function encodeExport(format, song) {
  const definition = getFormat(format);

  switch (format) {
    case "wav": {
      if (!song) throw new Error("WAV export needs a generated song");
      const buffer = await renderOffline(song);
      return { data: audioBufferToWav(buffer), ...definition };
    }
    case "midi":
      return { data: exportMidi(song), ...definition };
    case "pico8":
      return { data: exportPico8(song), ...definition };
    case "picotron": {
      if (!song) throw new Error("Picotron export needs a generated song");
      const events = buildSongEvents(song);
      const [sfx, baseBank] = await Promise.all([loadSfx(), loadBaseBank()]);
      const bank = buildPicotronBank(song, events, baseBank);
      return {
        data: buildPicotronPackage(song, { events, sfx, persistentSfx: encodePicotronBankSfx(bank) }),
        ...definition
      };
    }
    case "sfx":
      return { data: await loadSfx(), ...definition };
    case "license":
      return { data: getLicenseText(), ...definition };
    default:
      throw new Error(`No encoder for export format: ${format}`);
  }
}

/**
 * Bundle all formats plus ready-to-run PICO-8/Picotron files.
 * `includeWav: false` gives a fast test kit for arrangement checks.
 *
 * @param {object} song
 * @param {{includeWav?: boolean}} [options]
 */
export async function encodeTestKit(song, options = {}) {
  if (!song) throw new Error("Test kit needs a generated song");
  const includeWav = options.includeWav ?? true;

  const wav = includeWav
    ? new Uint8Array(audioBufferToWav(await renderOffline(song)))
    : null;

  const sfx = await loadSfx();
  const baseBank = await loadBaseBank();
  const bank = buildPicotronBank(song, buildSongEvents(song), baseBank);
  const persistentSfx = encodePicotronBankSfx(bank);

  return {
    data: buildTestKit(song, { wav, sfx, persistentSfx, includeWav }),
    filename: "bebop_test_kit.zip",
    binary: true
  };
}

async function loadSfx() {
  const response = await fetch("/assets/bebop.sfx");
  if (!response.ok) throw new Error(`Could not load bebop.sfx (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

async function loadBaseBank() {
  const response = await fetch("/assets/bebop-base.bin");
  if (!response.ok) throw new Error(`Could not load bebop-base.bin (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}
