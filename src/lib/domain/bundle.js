import { BUNDLE_FORMAT, BUNDLE_VERSION, LIMITS } from './model.js';
import { assetFileName, sha256Hex, toBytes } from './assets.js';
import { parseProject } from './project.js';

export function assetBundlePath(meta) {
  return `assets/${assetFileName(meta.hash, meta.name, meta.mime)}`;
}

export function thumbBundlePath(assetId) {
  return `thumbs/${assetId}.webp`;
}

export function isSafeBundlePath(path) {
  if (typeof path !== 'string' || path.length === 0 || path.length > 240) return false;
  if (path.startsWith('/') || path.startsWith('\\')) return false;
  if (path.includes('..') || path.includes('\\') || path.includes('\u0000')) return false;
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  return path === path.replace(/\/+/g, '/');
}

/**
 * @param {object} project
 * @param {Array<{meta: object}>} assets
 * @param {{createdAt: string, projectHash?: string, appVersion?: string}} options
 */
export function buildBundleManifest(project, assets, options) {
  return {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    createdWith: options.appVersion ?? 'cajita 1.1.1',
    createdAt: options.createdAt,
    project: 'project.json',
    projectHash: options.projectHash,
    assets: assets.map(({ meta }) => ({
      id: meta.id,
      path: assetBundlePath(meta),
      hash: meta.hash,
      mime: meta.mime,
      kind: meta.kind,
      bytes: meta.bytes
    })),
    thumbs: assets
      .filter((asset) => asset.thumb)
      .map((asset) => ({
        assetId: asset.meta.id,
        path: thumbBundlePath(asset.meta.id),
        hash: asset.thumbHash
      }))
  };
}

/**
 * Validate the manifest alone, before touching any asset or the project.
 *
 * @param {unknown} manifest
 * @returns {{ok: boolean, errors: Array<{path: string, message: string}>}}
 */
export function validateBundleManifest(manifest) {
  const errors = [];
  const push = (path, message) => errors.push({ path, message });

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, errors: [{ path: '', message: 'manifest must be an object' }] };
  }
  if (manifest.format !== BUNDLE_FORMAT) push('format', `must be ${BUNDLE_FORMAT}`);
  if (manifest.version !== BUNDLE_VERSION) push('version', `must be ${BUNDLE_VERSION}`);
  if (manifest.project !== 'project.json') push('project', 'must point at project.json');
  if (typeof manifest.createdAt !== 'string') push('createdAt', 'required');
  if (!Array.isArray(manifest.assets)) {
    push('assets', 'must be an array');
    return { ok: false, errors };
  }
  if (manifest.assets.length > LIMITS.importFiles) {
    push('assets', `at most ${LIMITS.importFiles} files`);
  }

  const ids = new Set();
  const paths = new Set();
  let bytes = 0;
  manifest.assets.forEach((asset, index) => {
    const path = `assets[${index}]`;
    if (!asset || typeof asset !== 'object') {
      push(path, 'must be an object');
      return;
    }
    for (const key of ['id', 'path', 'hash', 'mime', 'kind']) {
      if (typeof asset[key] !== 'string' || !asset[key]) {
        push(`${path}.${key}`, 'required');
      }
    }
    if (!isSafeBundlePath(asset.path)) push(`${path}.path`, 'unsafe path');
    if (!asset.path.startsWith('assets/')) push(`${path}.path`, 'must be under assets/');
    if (ids.has(asset.id)) push(`${path}.id`, 'duplicate asset id');
    if (paths.has(asset.path)) push(`${path}.path`, 'duplicate path');
    ids.add(asset.id);
    paths.add(asset.path);
    if (!Number.isFinite(asset.bytes) || asset.bytes < 0) {
      push(`${path}.bytes`, 'must be a number');
    } else {
      bytes += asset.bytes;
      if (asset.bytes > LIMITS.fileBytes) push(`${path}.bytes`, 'file is too large');
      if (asset.kind === 'font' && asset.bytes > LIMITS.fontBytes) {
        push(`${path}.bytes`, 'font is too large');
      }
    }
  });
  if (bytes > LIMITS.projectBytesHard) push('assets', 'bundle is too large');

  if (manifest.thumbs !== undefined) {
    if (!Array.isArray(manifest.thumbs)) {
      push('thumbs', 'must be an array');
    } else {
      const thumbPaths = new Set();
      manifest.thumbs.forEach((thumb, index) => {
        const path = `thumbs[${index}]`;
        if (!thumb || !isSafeBundlePath(thumb.path)) {
          push(`${path}.path`, 'unsafe path');
          return;
        }
        if (!thumb.path.startsWith('thumbs/'))
          push(`${path}.path`, 'must be under thumbs/');
        if (thumbPaths.has(thumb.path)) push(`${path}.path`, 'duplicate path');
        thumbPaths.add(thumb.path);
      });
    }
  }

  return { ok: errors.length === 0, errors };
}

export function bundleReadme(project) {
  return `cajita — ${project.title}

Este archivo .cajita es el proyecto editable de tu sitio.
Ábrelo de nuevo en cajita con "Abrir proyecto".

Incluye:
- project.json: las páginas, elementos, enlaces y metadatos.
- bundle.json: el manifiesto de los medios.
- assets/: imágenes, videos, sonidos y tipografías.
- thumbs/: miniaturas para la biblioteca.

No contiene tokens de GitHub ni datos de publicación.
`;
}

/**
 * Parse the uncompressed files of a bundle. The caller unzips first; this keeps
 * the validation and hash checks testable without a browser.
 *
 * @param {Record<string, Uint8Array | ArrayBuffer>} files
 * @returns {Promise<{ok: boolean, project?: object, assets?: Array<{meta: object, bytes: Uint8Array, path: string}>, thumbs?: Record<string, Uint8Array>, errors: Array<{path: string, message: string}>}>}
 */
export async function parseBundleFiles(files) {
  const errors = [];
  const push = (path, message) => errors.push({ path, message });

  const bundleBytes = files['bundle.json'];
  const projectBytes = files['project.json'];
  if (!bundleBytes)
    return { ok: false, errors: [{ path: 'bundle.json', message: 'missing' }] };
  if (!projectBytes)
    return { ok: false, errors: [{ path: 'project.json', message: 'missing' }] };

  let manifest;
  let rawProject;
  try {
    manifest = JSON.parse(new TextDecoder().decode(toBytes(bundleBytes)));
  } catch {
    return { ok: false, errors: [{ path: 'bundle.json', message: 'invalid JSON' }] };
  }
  try {
    rawProject = JSON.parse(new TextDecoder().decode(toBytes(projectBytes)));
  } catch {
    return { ok: false, errors: [{ path: 'project.json', message: 'invalid JSON' }] };
  }

  const manifestResult = validateBundleManifest(manifest);
  errors.push(...manifestResult.errors);
  if (!manifestResult.ok) return { ok: false, errors };

  const projectResult = parseProject(rawProject);
  if (!projectResult.ok) {
    return { ok: false, errors: [...errors, ...projectResult.errors] };
  }
  const project = projectResult.project;

  if (manifest.projectHash) {
    const actual = await sha256Hex(projectBytes);
    if (actual !== manifest.projectHash) {
      push('projectHash', 'does not match project.json');
    }
  }

  const entries = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  const assets = [];

  for (const [assetId, meta] of Object.entries(project.assets ?? {})) {
    const entry = entries.get(assetId);
    if (!entry) {
      push(`assets.${assetId}`, 'missing from bundle.json');
      continue;
    }
    const bytes = files[entry.path];
    if (!bytes) {
      push(entry.path, 'missing from archive');
      continue;
    }
    const data = toBytes(bytes);
    if (data.byteLength !== entry.bytes) {
      push(entry.path, 'size does not match bundle.json');
      continue;
    }
    const hash = await sha256Hex(data);
    if (hash !== entry.hash || hash !== meta.hash) {
      push(entry.path, 'hash does not match');
      continue;
    }
    assets.push({ meta, bytes: data, path: entry.path });
  }

  const thumbEntries = new Map(
    (manifest.thumbs ?? []).map((thumb) => [thumb.assetId, thumb])
  );
  const thumbs = {};
  for (const [assetId, thumb] of thumbEntries) {
    const bytes = files[thumb.path];
    if (!bytes) {
      push(thumb.path, 'missing from archive');
      continue;
    }
    const data = toBytes(bytes);
    if (thumb.hash) {
      const actual = await sha256Hex(data);
      if (actual !== thumb.hash) push(thumb.path, 'hash does not match');
    }
    thumbs[assetId] = data;
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, project, assets, thumbs, errors: [] };
}
