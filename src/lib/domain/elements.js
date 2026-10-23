import { createId } from './model.js';
import { fontFamily } from './fonts.js';
import { shapeLabel } from './shapes.js';

/**
 * Built-in font IDs are stored in text elements. Only the families actually
 * shipped in `src/styles/fonts.css` are offered in S2.
 */
export const BUILTIN_FONTS = Object.freeze([
  { id: 'fraunces', label: 'Fraunces', family: 'Fraunces', pairing: 'editorial' },
  {
    id: 'archivo-black',
    label: 'Archivo Black',
    family: 'Archivo Black',
    pairing: 'poster'
  },
  { id: 'space-mono', label: 'Space Mono', family: 'Space Mono', pairing: 'technical' }
]);

const BUILTIN_BY_ID = new Map(BUILTIN_FONTS.map((font) => [font.id, font]));

export function defaultTextStyle(project) {
  return {
    font: 'fraunces',
    fontSize: 64,
    lineHeight: 1.05,
    letterSpacing: 0,
    align: 'left',
    color: project?.theme?.ink ?? '#1c1917',
    background: null,
    padding: 0,
    heading: false
  };
}

export function defaultFrame(stage, type = 'text', index = 0) {
  const offset = (index % 4) * 24;
  if (type === 'image') {
    const w = Math.min(520, stage.width * 0.46);
    const h = Math.min(360, stage.height * 0.46);
    return {
      x: (stage.width - w) / 2 + offset,
      y: (stage.height - h) / 2 + offset,
      w,
      h,
      rotation: 0
    };
  }
  if (type === 'ficha') {
    const w = Math.min(320, stage.width * 0.34);
    const h = Math.min(400, stage.height * 0.46);
    return {
      x: (stage.width - w) / 2 + offset,
      y: (stage.height - h) / 2 + offset,
      w,
      h,
      rotation: 0
    };
  }

  if (type === 'shape') {
    const size = Math.min(260, stage.width * 0.32, stage.height * 0.32);
    return {
      x: (stage.width - size) / 2 + offset,
      y: (stage.height - size) / 2 + offset,
      w: size,
      h: size,
      rotation: 0
    };
  }

  if (type === 'embed') {
    const w = Math.min(720, stage.width * 0.6);
    const h = w * 0.5625;
    return {
      x: (stage.width - w) / 2 + offset,
      y: (stage.height - h) / 2 + offset,
      w,
      h,
      rotation: 0
    };
  }

  if (type === 'audio') {
    const w = Math.min(420, stage.width * 0.45);
    const h = 76;
    return {
      x: (stage.width - w) / 2 + offset,
      y: stage.height * 0.56 + offset,
      w,
      h,
      rotation: 0
    };
  }
  const w = Math.min(620, stage.width * 0.58);
  const h = Math.min(300, stage.height * 0.4);
  return {
    x: stage.width * 0.1 + offset,
    y: stage.height * 0.18 + offset,
    w,
    h,
    rotation: 0
  };
}

export function mediaFrame(asset, stage, index = 0) {
  if (asset?.kind === 'audio') return defaultFrame(stage, 'audio', index);
  if (!asset?.width || !asset?.height)
    return defaultFrame(stage, asset?.kind ?? 'image', index);
  return imageFrame(asset, stage, index);
}

export function imageFrame(asset, stage, index = 0) {
  const frame = defaultFrame(stage, 'image', index);
  if (!asset?.width || !asset?.height) return frame;
  const ratio = asset.width / asset.height;
  let w = frame.w;
  let h = w / ratio;
  if (h > frame.h) {
    h = frame.h;
    w = h * ratio;
  }
  return {
    ...frame,
    x: (stage.width - w) / 2 + (index % 4) * 18,
    y: (stage.height - h) / 2 + (index % 4) * 18,
    w,
    h
  };
}

function nextZ(page) {
  return (
    (page.elements ?? []).reduce((max, element) => Math.max(max, element.z ?? 0), 0) + 1
  );
}

/**
 * Create a valid element for a page. Text and image are the S2 element types;
 * video/audio keep the same shape for later sprints.
 */
export function createElement(type, options = {}) {
  const {
    project,
    page,
    stage = project?.stage ?? { width: 1200, height: 800 },
    asset,
    idFactory,
    index = page?.elements?.length ?? 0,
    frame,
    text = '',
    provider = '',
    url = '',
    title = '',
    caption = '',
    fichaId = '',
    name = '',
    shape = 'circle',
    fill = '',
    stroke = '',
    strokeWidth = 0,
    id
  } = options;

  const base = {
    id: id ?? createId('el', idFactory),
    frame: frame ?? defaultFrame(stage, type, index),
    z: nextZ(page ?? { elements: [] }),
    opacity: 1,
    locked: false,
    hidden: false,
    link: null,
    ...(name ? { name } : {})
  };

  if (type === 'text') {
    return {
      ...base,
      type: 'text',
      text,
      ...defaultTextStyle(project)
    };
  }

  if (type === 'image') {
    return {
      ...base,
      type: 'image',
      assetId: asset?.id ?? '',
      alt: asset?.name ?? '',
      fit: 'cover',
      pixelated: false,
      mask: []
    };
  }

  if (type === 'video') {
    return {
      ...base,
      type: 'video',
      assetId: asset?.id ?? '',
      fit: 'cover',
      autoplay: false,
      loop: false,
      muted: true,
      controls: true
    };
  }

  if (type === 'embed') {
    return {
      ...base,
      type: 'embed',
      provider,
      url,
      title: title || (provider === 'observable' ? 'Observable' : 'YouTube'),
      caption
    };
  }

  if (type === 'ficha') {
    return {
      ...base,
      type: 'ficha',
      fichaId
    };
  }

  if (type === 'shape') {
    return {
      ...base,
      type: 'shape',
      shape,
      fill: fill || project?.theme?.accent || '#a82a1e',
      stroke: stroke || project?.theme?.ink || '#1c1917',
      strokeWidth
    };
  }

  if (type === 'audio') {
    return {
      ...base,
      type: 'audio',
      assetId: asset?.id ?? '',
      label: asset?.name ?? '',
      autoplay: false,
      loop: false,
      controls: true
    };
  }

  throw new Error(`Unknown element type: ${type}`);
}

export function duplicateElement(element, { idFactory } = {}) {
  return {
    ...structuredClone(element),
    id: createId('el', idFactory),
    z: (element.z ?? 0) + 1,
    frame: { ...element.frame, x: element.frame.x + 24, y: element.frame.y + 24 },
    link: element.link ? structuredClone(element.link) : null
  };
}

export function builtinFont(fontId) {
  return BUILTIN_BY_ID.get(fontId) ?? null;
}

export function fontStack(project, fontId) {
  const builtin = builtinFont(fontId);
  if (builtin) return `'${builtin.family}', Georgia, serif`;
  const custom = project?.fonts?.[fontId];
  if (custom) return `'${fontFamily(custom)}', Georgia, serif`;
  return "'Fraunces', Georgia, serif";
}

export function elementName(element, index = 0) {
  if (element.name?.trim()) return element.name.trim();
  if (element.type === 'text') {
    const text = element.text?.trim().replace(/\s+/g, ' ').slice(0, 28);
    return text || `Texto ${index + 1}`;
  }
  if (element.type === 'image') return element.alt || `Imagen ${index + 1}`;
  if (element.type === 'video') return `Video ${index + 1}`;
  if (element.type === 'audio') return element.label || `Audio ${index + 1}`;
  if (element.type === 'embed')
    return (
      element.title ||
      (element.provider === 'observable'
        ? `Observable ${index + 1}`
        : `YouTube ${index + 1}`)
    );
  if (element.type === 'shape') return `${shapeLabel(element.shape, 'es')} ${index + 1}`;
  if (element.type === 'ficha') return element.name || `Ficha ${index + 1}`;
  return `Elemento ${index + 1}`;
}
