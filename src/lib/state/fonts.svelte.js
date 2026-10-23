import { platform } from '../platform/index.js';
import { fontFamily } from '../domain/fonts.js';

const loaded = new Map();
export const fontState = $state({ version: 0 });

async function loadOne(project, font) {
  const key = `${project.id}:${font.id}`;
  if (loaded.has(key)) return loaded.get(key);
  const promise = (async () => {
    const row = await platform.assets.get(project.id, font.assetId);
    if (!row?.blob) throw new Error(`No se encontró la tipografía ${font.name}.`);
    const url = URL.createObjectURL(row.blob);
    try {
      const face = new FontFace(fontFamily(font), `url(${url})`, {
        weight: String(font.weight ?? 400),
        style: font.style ?? 'normal'
      });
      await face.load();
      document.fonts.add(face);
      fontState.version += 1;
      return face;
    } finally {
      URL.revokeObjectURL(url);
    }
  })();
  loaded.set(key, promise);
  try {
    return await promise;
  } catch (error) {
    loaded.delete(key);
    throw error;
  }
}

/** Load every custom font in the project. Failures are non-fatal: text falls back. */
export async function ensureProjectFonts(project) {
  if (!project) return;
  await Promise.allSettled(
    Object.values(project.fonts ?? {}).map((font) => loadOne(project, font))
  );
}
