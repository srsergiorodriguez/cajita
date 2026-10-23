import { unzip, strFromU8 } from 'fflate';
import { mimeFromName } from '../../domain/assets.js';
import { LIMITS } from '../../domain/model.js';

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

function extension(name) {
  return String(name).split('.').pop()?.toLowerCase() ?? '';
}

function unzipAsync(bytes) {
  return new Promise((resolve, reject) => {
    unzip(bytes, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

/**
 * Read a collection ZIP without touching project state. The ZIP should contain
 * one CSV and image files; paths are reduced to basenames for matching.
 */
export async function readCollectionZip(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > LIMITS.projectBytesHard) {
    throw new Error('El ZIP es demasiado grande.');
  }
  const entries = await unzipAsync(bytes);
  const csvEntries = [];
  const images = [];
  const names = new Set();
  let totalImageBytes = 0;

  for (const [path, data] of Object.entries(entries)) {
    if (!path || path.endsWith('/')) continue;
    if (path.startsWith('__MACOSX/') || path.split('/').some((part) => part.startsWith('.'))) {
      continue;
    }
    const name = path.split('/').pop() ?? '';
    if (!name) continue;
    const ext = extension(name);
    if (ext === 'csv') {
      csvEntries.push({ path, name, bytes: data });
      continue;
    }
    if (!IMAGE_EXT.has(ext)) continue;
    if (names.has(name.toLowerCase())) {
      throw new Error(`Hay dos imágenes con el mismo nombre: ${name}.`);
    }
    names.add(name.toLowerCase());
    totalImageBytes += data.byteLength;
    if (images.length >= LIMITS.images) {
      throw new Error(`El ZIP contiene más de ${LIMITS.images} imágenes.`);
    }
    images.push({
      name,
      bytes: data,
      type: mimeFromName(name) || 'application/octet-stream'
    });
  }

  if (csvEntries.length === 0) {
    throw new Error('El ZIP no contiene un archivo CSV.');
  }
  const preferred = csvEntries.find((entry) => entry.name.toLowerCase() === 'fichas.csv');
  if (!preferred && csvEntries.length > 1) {
    throw new Error('El ZIP contiene varios CSV; incluye uno llamado fichas.csv.');
  }
  const csv = preferred ?? csvEntries[0];
  if (csv.bytes.byteLength > 10 * 1024 * 1024) {
    throw new Error('El CSV es demasiado grande.');
  }
  if (totalImageBytes > LIMITS.projectBytesHard) {
    throw new Error('Las imágenes del ZIP son demasiado grandes.');
  }
  return {
    csvName: csv.name,
    csvText: strFromU8(csv.bytes),
    images,
    totalImageBytes
  };
}
