import { strFromU8, strToU8, unzip, zip } from 'fflate';
import { LIMITS, cloneProject } from '../../domain/model.js';
import { sha256Hex } from '../../domain/assets.js';
import {
  bundleReadme,
  buildBundleManifest,
  parseBundleFiles
} from '../../domain/bundle.js';
import { projectRepository } from './repository.js';

function zipAsync(files) {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

function unzipAsync(bytes) {
  return new Promise((resolve, reject) => {
    unzip(bytes, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

export async function buildProjectBundle(project) {
  const assets = [];
  for (const meta of Object.values(project.assets ?? {})) {
    const row = await projectRepository.getAsset(project.id, meta.id);
    if (!row) throw new Error(`Falta el medio ${meta.name} en este navegador.`);
    const thumbRow = await projectRepository.getThumb(project.id, meta.id);
    let thumbHash;
    if (thumbRow?.blob) {
      thumbHash = thumbRow.hash ?? (await sha256Hex(await thumbRow.blob.arrayBuffer()));
    }
    assets.push({
      meta,
      blob: row.blob,
      thumb: thumbRow?.blob ?? null,
      thumbHash
    });
  }

  const projectJson = strToU8(JSON.stringify(project, null, 2));
  const projectHash = await sha256Hex(projectJson);
  const manifest = buildBundleManifest(project, assets, {
    createdAt: new Date().toISOString(),
    projectHash
  });
  const files = {
    'bundle.json': [strToU8(JSON.stringify(manifest, null, 2)), { level: 9 }],
    'project.json': [projectJson, { level: 9 }],
    'README.txt': [strToU8(bundleReadme(project)), { level: 9 }]
  };

  for (const asset of assets) {
    const bytes = new Uint8Array(await asset.blob.arrayBuffer());
    files[manifest.assets.find((entry) => entry.id === asset.meta.id).path] = [
      bytes,
      { level: 0 }
    ];
    if (asset.thumb) {
      const thumbBytes = new Uint8Array(await asset.thumb.arrayBuffer());
      files[`thumbs/${asset.meta.id}.webp`] = [thumbBytes, { level: 0 }];
    }
  }

  return zipAsync(files);
}

export async function readProjectBundle(bytes) {
  if (bytes.byteLength > LIMITS.projectBytesHard) {
    throw new Error('El archivo es demasiado grande para abrirlo en cajita.');
  }
  const files = await unzipAsync(bytes);
  if (Object.keys(files).length > LIMITS.importFiles) {
    throw new Error('El archivo contiene demasiados ficheros.');
  }
  const parsed = await parseBundleFiles(files);
  if (!parsed.ok) {
    const first = parsed.errors[0];
    throw new Error(`${first.path || 'bundle'}: ${first.message}`);
  }
  return parsed;
}

export async function importProjectBundle(bytes) {
  const parsed = await readProjectBundle(bytes);
  const project = cloneProject(parsed.project);
  const assets = [];
  for (const entry of parsed.assets) {
    assets.push({
      meta: entry.meta,
      blob: new Blob([entry.bytes], { type: entry.meta.mime }),
      thumb: parsed.thumbs?.[entry.meta.id]
        ? new Blob([parsed.thumbs[entry.meta.id]], { type: 'image/webp' })
        : null,
      thumbHash: parsed.thumbs?.[entry.meta.id]
        ? await sha256Hex(parsed.thumbs[entry.meta.id])
        : undefined
    });
  }
  await projectRepository.importProject(project, assets, parsed.thumbs);
  return project;
}

export function bundleFileName(project) {
  const date = new Date().toISOString().slice(0, 10);
  return `${project.slug || 'cajita'}-${date}.cajita`;
}

export { strFromU8 };
