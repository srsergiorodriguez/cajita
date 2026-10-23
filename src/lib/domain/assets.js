import { LIMITS } from './model.js';
import { slugify } from './slugs.js';

export const IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
]);
export const VIDEO_MIMES = new Set(['video/mp4', 'video/webm']);
export const AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4'
]);
export const FONT_MIMES = new Set([
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'application/x-font-ttf',
  'application/x-font-opentype'
]);

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'font/ttf': 'ttf',
  'font/otf': 'otf',
  'font/woff': 'woff',
  'font/woff2': 'woff2'
};

const MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2'
};

export function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array(0);
}

function startsWith(bytes, signature, offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes, start, end) {
  return String.fromCharCode(...bytes.slice(start, end));
}

/**
 * Sniff the format from magic bytes. The extension/fallback is only a hint.
 *
 * @param {Uint8Array | ArrayBuffer | ArrayBufferView} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function sniffMime(value, fallback = '') {
  const bytes = toBytes(value);
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a')
    return 'image/gif';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP')
    return 'image/webp';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WAVE') return 'audio/wav';
  if (ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12);
    if (brand === 'M4A ') return 'audio/mp4';
    return 'video/mp4';
  }
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm';
  if (ascii(bytes, 0, 4) === 'OggS') return 'audio/ogg';
  if (ascii(bytes, 0, 3) === 'ID3' || startsWith(bytes, [0xff, 0xfb]))
    return 'audio/mpeg';
  if (startsWith(bytes, [0x00, 0x01, 0x00, 0x00]) || ascii(bytes, 0, 4) === 'true') {
    return 'font/ttf';
  }
  if (ascii(bytes, 0, 4) === 'OTTO') return 'font/otf';
  if (ascii(bytes, 0, 4) === 'wOFF') return 'font/woff';
  if (ascii(bytes, 0, 4) === 'wOF2') return 'font/woff2';

  const normalized = String(fallback ?? '').toLowerCase();
  if (normalized.startsWith('image/') || normalized.startsWith('video/'))
    return normalized;
  if (normalized.startsWith('audio/') || normalized.startsWith('font/'))
    return normalized;
  return normalized;
}

export function mimeFromName(name = '') {
  const extension = String(name).split('.').pop().toLowerCase();
  return MIME_BY_EXT[extension] ?? '';
}

export function extensionForMime(mime) {
  return EXT_BY_MIME[mime] ?? '';
}

export function kindForMime(mime) {
  if (IMAGE_MIMES.has(mime)) return 'image';
  if (VIDEO_MIMES.has(mime)) return 'video';
  if (AUDIO_MIMES.has(mime)) return 'audio';
  if (FONT_MIMES.has(mime)) return 'font';
  return null;
}

export function isSupportedMime(mime) {
  return kindForMime(mime) !== null;
}

export function isAnimatedImage(mime) {
  return mime === 'image/gif';
}

export function safeFileName(name = 'archivo') {
  const clean = String(name).split(/[\\/]/).pop() ?? 'archivo';
  const withoutControl = clean.replace(/[\u0000-\u001f\u007f]/g, '');
  const extension = withoutControl.split('.').pop().toLowerCase();
  const base = slugify(withoutControl.replace(/\.[^.]+$/, '')) || 'archivo';
  return `${base}.${extension}`;
}

/**
 * Content-addressed asset file name for the exported site and bundle.
 *
 * @param {string} hash
 * @param {string} name
 * @param {string} mime
 * @returns {string}
 */
export function assetFileName(hash, name, mime) {
  const base = slugify(String(name).replace(/\.[^.]+$/, '')) || 'archivo';
  const ext = extensionForMime(mime) || String(name).split('.').pop() || 'bin';
  return `${String(hash).slice(0, 10)}-${base}.${ext}`;
}

export async function sha256Hex(value) {
  const bytes = toBytes(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function assetCounts(project) {
  const counts = { image: 0, video: 0, audio: 0, font: 0 };
  let videoBytes = 0;
  for (const asset of Object.values(project?.assets ?? {})) {
    counts[asset.kind] = (counts[asset.kind] ?? 0) + 1;
    if (asset.kind === 'video') videoBytes += Number(asset.bytes) || 0;
  }
  return { ...counts, videoBytes };
}

/**
 * Check the project-level media caps before an asset is imported.
 *
 * @param {object} project
 * @param {string} kind
 * @param {number} bytes
 * @returns {{ok: true} | {ok: false, code: string, message: string}}
 */
export function checkAssetLimit(project, kind, bytes) {
  if (!['image', 'video', 'audio', 'font'].includes(kind)) {
    return { ok: false, code: 'ASSET_UNSUPPORTED', message: 'unsupported asset kind' };
  }
  if (bytes > LIMITS.fileBytes) {
    return { ok: false, code: 'ASSET_TOO_LARGE', message: 'file is larger than 50 MB' };
  }
  if (kind === 'video' && bytes > LIMITS.videoFileBytes) {
    return { ok: false, code: 'ASSET_TOO_LARGE', message: 'video is larger than 20 MB' };
  }
  if (kind === 'font' && bytes > LIMITS.fontBytes) {
    return { ok: false, code: 'ASSET_TOO_LARGE', message: 'font is larger than 5 MB' };
  }

  const counts = assetCounts(project);
  if (kind === 'image' && counts.image >= LIMITS.images) {
    return { ok: false, code: 'ASSET_LIMIT', message: 'image limit reached' };
  }
  if (kind === 'audio' && counts.audio >= LIMITS.audio) {
    return { ok: false, code: 'ASSET_LIMIT', message: 'audio limit reached' };
  }
  if (kind === 'video' && counts.video >= LIMITS.videos) {
    return { ok: false, code: 'ASSET_LIMIT', message: 'video limit reached' };
  }
  if (kind === 'video' && counts.videoBytes + bytes > LIMITS.videoBytes) {
    return { ok: false, code: 'ASSET_LIMIT', message: 'video size limit reached' };
  }
  if (kind === 'font' && counts.font >= LIMITS.fonts) {
    return { ok: false, code: 'ASSET_LIMIT', message: 'font limit reached' };
  }

  return { ok: true };
}

export function findAssetByHash(project, hash) {
  return (
    Object.values(project?.assets ?? {}).find((asset) => asset.hash === hash) ?? null
  );
}

export function projectBytes(project) {
  return Object.values(project?.assets ?? {}).reduce(
    (total, asset) => total + (Number(asset.bytes) || 0),
    0
  );
}
