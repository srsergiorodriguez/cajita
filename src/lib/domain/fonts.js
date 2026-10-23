import { LIMITS } from './model.js';
import {
  extensionForMime,
  FONT_MIMES,
  kindForMime,
  mimeFromName,
  sniffMime
} from './assets.js';

export const FONT_FORMATS = new Set(['truetype', 'opentype', 'woff', 'woff2']);

const FORMAT_BY_MIME = {
  'font/ttf': 'truetype',
  'application/x-font-ttf': 'truetype',
  'font/otf': 'opentype',
  'application/x-font-opentype': 'opentype',
  'font/woff': 'woff',
  'application/font-woff': 'woff',
  'font/woff2': 'woff2'
};

/**
 * Validate the metadata of a custom font, without parsing the file. Parsing is
 * done in the browser with FontFace before anything is stored.
 *
 * @param {{name: string, bytes: Uint8Array | ArrayBuffer | ArrayBufferView, mime?: string}} input
 * @returns {{ok: true, format: string, mime: string, extension: string, bytes: number} | {ok: false, code: string, message: string}}
 */
export function validateFontFile({ name, bytes, mime = '' }) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const detected = sniffMime(value);
  if (!FONT_MIMES.has(detected) || kindForMime(detected) !== 'font') {
    return {
      ok: false,
      code: 'ASSET_UNSUPPORTED',
      message: 'font must be TTF, OTF, WOFF, or WOFF2'
    };
  }
  if (value.byteLength > LIMITS.fontBytes) {
    return { ok: false, code: 'ASSET_TOO_LARGE', message: 'font is larger than 5 MB' };
  }
  const format = FORMAT_BY_MIME[detected];
  if (!FONT_FORMATS.has(format)) {
    return { ok: false, code: 'ASSET_UNSUPPORTED', message: 'unknown font format' };
  }
  return {
    ok: true,
    format,
    mime: detected,
    extension: extensionForMime(detected),
    bytes: value.byteLength
  };
}

/**
 * @param {object} project
 * @returns {{ok: boolean, message?: string}}
 */
export function canAddFont(project) {
  const count = Object.keys(project?.fonts ?? {}).length;
  if (count >= LIMITS.fonts) {
    return { ok: false, message: `at most ${LIMITS.fonts} custom fonts` };
  }
  return { ok: true };
}

export function fontNameExists(project, name, exceptId = null) {
  const normalized = String(name).trim().toLowerCase();
  return Object.values(project?.fonts ?? {}).some(
    (font) => font.id !== exceptId && font.name.trim().toLowerCase() === normalized
  );
}

export function fontFamily(font) {
  return `cajita-font-${font.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export function fontsUsedByPage(page) {
  const ids = new Set();
  for (const element of page?.elements ?? []) {
    if (element.type === 'text') ids.add(element.font);
  }
  return ids;
}

export function fontUsage(project, fontId) {
  let count = 0;
  for (const page of project?.pages ?? []) {
    for (const element of page.elements ?? []) {
      if (element.type === 'text' && element.font === fontId) count += 1;
    }
  }
  return count;
}
