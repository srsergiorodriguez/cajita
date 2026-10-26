import { zipSync, strToU8 } from 'fflate';
import { assetFileName } from '../../domain/assets.js';
import { buildSite } from '../../export/site.js';
import { buildSingleFile } from '../../export/single-file.js';
import { builtinFontFiles, fontFaces } from '../../export/fonts.js';
import { loadBuiltinFontBytes } from '../../export/builtin-fonts.js';
import ExportWorker from './export-worker.js?worker';
import { projectRepository } from './repository.js';

function assetPath(asset) {
  return `assets/${assetFileName(asset.hash, asset.name, asset.mime)}`;
}

export function singleFileName(project) {
  const date = new Date().toISOString().slice(0, 10);
  return `${project.slug}-sitio-${date}.html`;
}

function base64FromBytes(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function dataUrl(bytes, mime) {
  return `data:${mime || 'application/octet-stream'};base64,${base64FromBytes(bytes)}`;
}

export function siteFileName(project) {
  const date = new Date().toISOString().slice(0, 10);
  return `${project.slug}-sitio-${date}.zip`;
}

function isText(mime) {
  return (
    mime.startsWith('text/') ||
    mime === 'application/javascript' ||
    mime === 'image/svg+xml' ||
    mime === 'application/json'
  );
}

function zipEntries(entries) {
  const zippedEntries = {};
  for (const [path, file] of entries) {
    zippedEntries[path] = [file.bytes, { level: isText(file.mime) ? 6 : 0 }];
  }
  return zipSync(zippedEntries);
}

function zipEntriesInWorker(entries) {
  if (typeof Worker === 'undefined') return Promise.resolve(zipEntries(entries));
  return new Promise((resolve, reject) => {
    const worker = new ExportWorker();
    worker.onmessage = (event) => {
      const data = event.data;
      worker.terminate();
      if (data?.ok && data.bytes) resolve(new Uint8Array(data.bytes));
      else reject(new Error(data?.error || 'No se pudo comprimir el sitio.'));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'El trabajador de exportación falló.'));
    };
    worker.postMessage({
      type: 'zip',
      entries: [...entries].map(([path, file]) => ({
        path,
        bytes: file.bytes,
        level: isText(file.mime) ? 6 : 0
      }))
    });
  });
}

/**
 * Build every byte the site needs exactly once. The ZIP export and GitHub
 * publisher share this tree; only the transport differs.
 */
export async function buildSiteEntries(project) {
  const faces = fontFaces(project, {
    builtinHref: (file) => file.path,
    customHref: (font) => {
      const asset = project.assets?.[font.assetId];
      return asset ? assetPath(asset) : `assets/${font.assetId}`;
    }
  });
  const site = buildSite(project, { fontFaces: faces });
  const entries = new Map();

  for (const file of site.files) {
    entries.set(file.path, {
      bytes: strToU8(file.content),
      mime: file.mime
    });
  }

  const builtinFiles = builtinFontFiles(project);
  if (builtinFiles.length) {
    const bytes = await loadBuiltinFontBytes(builtinFiles);
    for (const file of builtinFiles) {
      const data = bytes.get(file.id);
      if (data) entries.set(file.path, { bytes: data, mime: 'font/woff2' });
    }
  }

  for (const asset of site.assets) {
    const row = await projectRepository.getAsset(project.id, asset.id);
    if (!row?.blob) throw new Error(`Falta el medio ${asset.name} para exportar.`);
    entries.set(assetPath(asset), {
      bytes: new Uint8Array(await row.blob.arrayBuffer()),
      mime: asset.mime
    });
  }

  return { entries, site };
}

export function buildSingleFileFromEntries(project, entries, site) {
  const assetUrls = new Map();
  const htmlContent = new Map();
  for (const asset of site.assets) {
    const file = entries.get(assetPath(asset));
    if (!file) continue;
    if (asset.kind === 'html' || asset.mime === 'text/html') {
      htmlContent.set(asset.id, new TextDecoder().decode(file.bytes));
    } else {
      assetUrls.set(asset.id, dataUrl(file.bytes, asset.mime));
    }
  }
  const builtinHref = (file) => {
    const entry = entries.get(file.path);
    return entry ? dataUrl(entry.bytes, 'font/woff2') : '';
  };
  const customHref = (font) => {
    const asset = project.assets?.[font.assetId];
    return asset ? assetUrls.get(asset.id) ?? '' : '';
  };
  const faces = fontFaces(project, { builtinHref, customHref });
  return buildSingleFile(project, {
    assetHref: (_project, _page, asset) => assetUrls.get(asset.id) ?? '',
    htmlContent,
    builtinHref,
    customHref,
    fontFaces: faces
  });
}

export async function buildSingleFileExport(project) {
  const { entries, site } = await buildSiteEntries(project);
  const html = buildSingleFileFromEntries(project, entries, site);
  return {
    bytes: new TextEncoder().encode(html),
    name: singleFileName(project),
    site,
    mime: 'text/html'
  };
}

export async function buildExportOptions(project) {
  const { entries, site } = await buildSiteEntries(project);
  const fullBytes = await zipEntriesInWorker(entries);
  const html = buildSingleFileFromEntries(project, entries, site);
  const smallBytes = new TextEncoder().encode(html);
  const hasVideoAudio = site.assets.some(
    (asset) => asset.kind === 'video' || asset.kind === 'audio'
  );
  return {
    small: {
      bytes: smallBytes,
      name: singleFileName(project),
      mime: 'text/html'
    },
    full: {
      bytes: fullBytes,
      name: siteFileName(project),
      mime: 'application/zip'
    },
    hasVideoAudio,
    hasFichas: project.pages.some((page) => page.elements?.some((element) => element.type === 'ficha')),
    pageCount: project.pages.length,
    assetCount: site.assets.length
  };
}

export async function buildSiteZip(project) {
  const { entries, site } = await buildSiteEntries(project);
  return {
    bytes: await zipEntriesInWorker(entries),
    name: siteFileName(project),
    site
  };
}
