import { BUILTIN_FONT_FILES } from './builtin-fonts.js';
import { fontFamily } from '../domain/fonts.js';

export function builtinFontFiles(project) {
  const used = new Set();
  for (const page of project.pages ?? []) {
    for (const element of page.elements ?? []) {
      if (element.type !== 'text') continue;
      used.add(element.font);
    }
  }
  const files = [];
  for (const file of BUILTIN_FONT_FILES) {
    if (!used.has(file.id)) continue;
    files.push(file);
    if (file.id === 'space-mono') {
      const bold = BUILTIN_FONT_FILES.find((item) => item.id === 'space-mono-bold');
      if (bold) files.push(bold);
    }
  }
  return files;
}

export function fontFaces(project, { builtinHref, customHref }) {
  const faces = [];
  for (const file of builtinFontFiles(project)) {
    faces.push({
      family: file.family,
      src: builtinHref(file),
      format: 'woff2',
      weight: file.weight,
      style: file.style
    });
  }
  for (const font of usedCustomFonts(project)) {
    faces.push({
      family: fontFamily(font),
      src: customHref(font),
      format: font.format ?? 'woff2',
      weight: font.weight ?? 400,
      style: font.style ?? 'normal'
    });
  }
  return faces;
}

export function usedCustomFonts(project) {
  const used = new Set();
  for (const page of project.pages ?? []) {
    for (const element of page.elements ?? []) {
      if (element.type === 'text' && project.fonts?.[element.font]) {
        used.add(element.font);
      }
    }
  }
  return Object.values(project.fonts ?? {}).filter((font) => used.has(font.id));
}
