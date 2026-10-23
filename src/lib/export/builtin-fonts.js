import space400 from '../../assets/fonts/space-mono-400.woff2?url';
import space700 from '../../assets/fonts/space-mono-700.woff2?url';
import archivo from '../../assets/fonts/archivo-black-400.woff2?url';
import fraunces from '../../assets/fonts/fraunces-400.woff2?url';
import frauncesItalic from '../../assets/fonts/fraunces-400-italic.woff2?url';

/**
 * Built-in font files included in an export only when a text element uses the
 * family. The app CSS and the exported CSS share the same family names.
 */
export const BUILTIN_FONT_FILES = Object.freeze([
  {
    id: 'fraunces',
    family: 'Fraunces',
    weight: 400,
    style: 'normal',
    path: 'fonts/fraunces-400.woff2',
    url: fraunces
  },
  {
    id: 'fraunces-italic',
    family: 'Fraunces',
    weight: 400,
    style: 'italic',
    path: 'fonts/fraunces-400-italic.woff2',
    url: frauncesItalic
  },
  {
    id: 'archivo-black',
    family: 'Archivo Black',
    weight: 400,
    style: 'normal',
    path: 'fonts/archivo-black-400.woff2',
    url: archivo
  },
  {
    id: 'space-mono',
    family: 'Space Mono',
    weight: 400,
    style: 'normal',
    path: 'fonts/space-mono-400.woff2',
    url: space400
  },
  {
    id: 'space-mono-bold',
    family: 'Space Mono',
    weight: 700,
    style: 'normal',
    path: 'fonts/space-mono-700.woff2',
    url: space700
  }
]);

export async function loadBuiltinFontBytes() {
  const entries = await Promise.all(
    BUILTIN_FONT_FILES.map(async (font) => {
      const response = await fetch(font.url);
      if (!response.ok) throw new Error(`No se pudo cargar ${font.path}.`);
      return [font.id, new Uint8Array(await response.arrayBuffer())];
    })
  );
  return new Map(entries);
}
