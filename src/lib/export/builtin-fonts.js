import space400 from '../../assets/fonts/space-mono-400.woff2?url';
import space700 from '../../assets/fonts/space-mono-700.woff2?url';
import archivo from '../../assets/fonts/archivo-black-400.woff2?url';
import fraunces from '../../assets/fonts/fraunces-400.woff2?url';
import frauncesItalic from '../../assets/fonts/fraunces-400-italic.woff2?url';
import anton from '../../assets/fonts/anton-400.woff2?url';
import azeret_mono from '../../assets/fonts/azeret-mono-400.woff2?url';
import bebas_neue from '../../assets/fonts/bebas-neue-400.woff2?url';
import cormorant from '../../assets/fonts/cormorant-400.woff2?url';
import epilogue from '../../assets/fonts/epilogue-400.woff2?url';
import ibm_plex_mono from '../../assets/fonts/ibm-plex-mono-500.woff2?url';
import jetbrains_mono from '../../assets/fonts/jetbrains-mono-500.woff2?url';
import josefin_sans from '../../assets/fonts/josefin-sans-400.woff2?url';
import jost from '../../assets/fonts/jost-400.woff2?url';
import krona_one from '../../assets/fonts/krona-one-400.woff2?url';
import lexend from '../../assets/fonts/lexend-400.woff2?url';
import outfit from '../../assets/fonts/outfit-400.woff2?url';
import playfair_display from '../../assets/fonts/playfair-display-400.woff2?url';
import righteous from '../../assets/fonts/righteous-400.woff2?url';
import share_tech_mono from '../../assets/fonts/share-tech-mono-400.woff2?url';
import sora from '../../assets/fonts/sora-400.woff2?url';
import space_grotesk from '../../assets/fonts/space-grotesk-400.woff2?url';
import syne from '../../assets/fonts/syne-400.woff2?url';
import zilla_slab from '../../assets/fonts/zilla-slab-400.woff2?url';

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
  },
  {
    id: 'anton',
    family: 'Anton',
    weight: 400,
    style: 'normal',
    path: 'fonts/anton-400.woff2',
    url: anton
  },
  {
    id: 'azeret-mono',
    family: 'Azeret Mono',
    weight: 400,
    style: 'normal',
    path: 'fonts/azeret-mono-400.woff2',
    url: azeret_mono
  },
  {
    id: 'bebas-neue',
    family: 'Bebas Neue',
    weight: 400,
    style: 'normal',
    path: 'fonts/bebas-neue-400.woff2',
    url: bebas_neue
  },
  {
    id: 'cormorant',
    family: 'Cormorant',
    weight: 400,
    style: 'normal',
    path: 'fonts/cormorant-400.woff2',
    url: cormorant
  },
  {
    id: 'epilogue',
    family: 'Epilogue',
    weight: 400,
    style: 'normal',
    path: 'fonts/epilogue-400.woff2',
    url: epilogue
  },
  {
    id: 'ibm-plex-mono',
    family: 'IBM Plex Mono',
    weight: 500,
    style: 'normal',
    path: 'fonts/ibm-plex-mono-500.woff2',
    url: ibm_plex_mono
  },
  {
    id: 'jetbrains-mono',
    family: 'JetBrains Mono',
    weight: 500,
    style: 'normal',
    path: 'fonts/jetbrains-mono-500.woff2',
    url: jetbrains_mono
  },
  {
    id: 'josefin-sans',
    family: 'Josefin Sans',
    weight: 400,
    style: 'normal',
    path: 'fonts/josefin-sans-400.woff2',
    url: josefin_sans
  },
  {
    id: 'jost',
    family: 'Jost',
    weight: 400,
    style: 'normal',
    path: 'fonts/jost-400.woff2',
    url: jost
  },
  {
    id: 'krona-one',
    family: 'Krona One',
    weight: 400,
    style: 'normal',
    path: 'fonts/krona-one-400.woff2',
    url: krona_one
  },
  {
    id: 'lexend',
    family: 'Lexend',
    weight: 400,
    style: 'normal',
    path: 'fonts/lexend-400.woff2',
    url: lexend
  },
  {
    id: 'outfit',
    family: 'Outfit',
    weight: 400,
    style: 'normal',
    path: 'fonts/outfit-400.woff2',
    url: outfit
  },
  {
    id: 'playfair-display',
    family: 'Playfair Display',
    weight: 400,
    style: 'normal',
    path: 'fonts/playfair-display-400.woff2',
    url: playfair_display
  },
  {
    id: 'righteous',
    family: 'Righteous',
    weight: 400,
    style: 'normal',
    path: 'fonts/righteous-400.woff2',
    url: righteous
  },
  {
    id: 'share-tech-mono',
    family: 'Share Tech Mono',
    weight: 400,
    style: 'normal',
    path: 'fonts/share-tech-mono-400.woff2',
    url: share_tech_mono
  },
  {
    id: 'sora',
    family: 'Sora',
    weight: 400,
    style: 'normal',
    path: 'fonts/sora-400.woff2',
    url: sora
  },
  {
    id: 'space-grotesk',
    family: 'Space Grotesk',
    weight: 400,
    style: 'normal',
    path: 'fonts/space-grotesk-400.woff2',
    url: space_grotesk
  },
  {
    id: 'syne',
    family: 'Syne',
    weight: 400,
    style: 'normal',
    path: 'fonts/syne-400.woff2',
    url: syne
  },
  {
    id: 'zilla-slab',
    family: 'Zilla Slab',
    weight: 400,
    style: 'normal',
    path: 'fonts/zilla-slab-400.woff2',
    url: zilla_slab
  },
]);

export async function loadBuiltinFontBytes(files = BUILTIN_FONT_FILES) {
  const entries = await Promise.all(
    files.map(async (font) => {
      const response = await fetch(font.url);
      if (!response.ok) throw new Error(`No se pudo cargar ${font.path}.`);
      return [font.id, new Uint8Array(await response.arrayBuffer())];
    })
  );
  return new Map(entries);
}
