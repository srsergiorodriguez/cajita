export const COMPOSITION_ROLES = Object.freeze(['idle', 'hover', 'pressed']);
export const COMPOSITION_CHILD_TYPES = Object.freeze(['shape', 'text', 'image', 'drawing']);
export const COMPOSITION_PRESETS = Object.freeze(['button', 'animation', 'blank']);
export const MAX_COMPOSITION_FRAMES = 8;
export const MAX_BUTTON_FRAMES = 3;

export function compositionFrameLimit(preset = 'blank') {
  return preset === 'button' ? MAX_BUTTON_FRAMES : MAX_COMPOSITION_FRAMES;
}

let sequence = 0;
function nextId(prefix) {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${sequence.toString(36)}`;
}

function clampFrame(frame = {}) {
  return {
    x: Math.max(0, Math.min(100, Number(frame.x) || 0)),
    y: Math.max(0, Math.min(100, Number(frame.y) || 0)),
    w: Math.max(1, Math.min(100, Number(frame.w) || 30)),
    h: Math.max(1, Math.min(100, Number(frame.h) || 30)),
    rotation: Number(frame.rotation) || 0
  };
}

export function createCompositionChild(type = 'text', options = {}) {
  const frame = clampFrame(options.frame ?? { x: 25, y: 25, w: 50, h: 50 });
  const base = {
    id: options.id ?? nextId('bc'),
    type,
    frame,
    opacity: options.opacity ?? 1,
    locked: Boolean(options.locked),
    hidden: Boolean(options.hidden),
    ...(options.name ? { name: options.name } : {})
  };
  if (type === 'shape') {
    return {
      ...base,
      shape: options.shape ?? 'square',
      fill: options.fill ?? '#a82a1e',
      stroke: options.stroke ?? '#1c1917',
      strokeWidth: Number(options.strokeWidth) || 0,
      radius: Math.max(0, Math.min(50, Number(options.radius) || 0))
    };
  }
  if (type === 'image' || type === 'drawing') {
    return {
      ...base,
      assetId: options.assetId ?? '',
      drawingId: options.drawingId ?? '',
      fit: options.fit === 'cover' ? 'cover' : 'contain',
      pixelated: Boolean(options.pixelated),
      alt: options.alt ?? ''
    };
  }
  return {
    ...base,
    text: options.text ?? 'Texto',
    font: options.font ?? 'space-mono',
    fontSize: Math.max(2, Math.min(30, Number(options.fontSize) || 8)),
    lineHeight: Number(options.lineHeight) || 1.05,
    letterSpacing: Number(options.letterSpacing) || 0,
    padding: Math.max(0, Number(options.padding) || 0),
    align: ['left', 'center', 'right'].includes(options.align) ? options.align : 'center',
    color: options.color ?? '#1c1917',
    background: options.background ?? null,
    heading: Boolean(options.heading)
  };
}

export function normaliseCompositionChild(child) {
  if (!child || !COMPOSITION_CHILD_TYPES.includes(child.type)) return null;
  return createCompositionChild(child.type, child);
}

export function createFrame(name = 'Fotograma', children = []) {
  return {
    id: nextId('frm'),
    name,
    duration: 400,
    children: children.map(normaliseCompositionChild).filter(Boolean)
  };
}

export function createComposition(preset = 'blank') {
  const clean = COMPOSITION_PRESETS.includes(preset) ? preset : 'blank';
  if (clean === 'button') {
    const idle = createFrame('inactivo', [
      createCompositionChild('shape', {
        frame: { x: 0, y: 0, w: 100, h: 100 },
        shape: 'square',
        fill: '#a82a1e',
        stroke: '#1c1917',
        strokeWidth: 0,
        radius: 8
      }),
      createCompositionChild('text', {
        frame: { x: 8, y: 18, w: 84, h: 64 },
        text: 'Botón',
        font: 'space-mono',
        fontSize: 7,
        color: '#fffdf7',
        align: 'center'
      })
    ]);
    const hover = createFrame('hover');
    const pressed = createFrame('pulsado');
    return {
      preset: 'button',
      frames: [idle, hover, pressed],
      interactions: { hover: hover.id, pressed: pressed.id },
      timeline: { autoplay: false, loop: false }
    };
  }
  if (clean === 'animation') {
    const first = createFrame('F1');
    const second = createFrame('F2');
    return {
      preset: 'animation',
      frames: [first, second],
      interactions: { hover: null, pressed: null },
      timeline: { autoplay: true, loop: true }
    };
  }
  const frame = createFrame('F1');
  return {
    preset: 'blank',
    frames: [frame],
    interactions: { hover: null, pressed: null },
    timeline: { autoplay: false, loop: false }
  };
}

function legacyFrames(raw) {
  const frameNames = ['inactivo', 'hover', 'pulsado'];
  return COMPOSITION_ROLES.map((role, index) =>
    createFrame(
      frameNames[index],
      Array.isArray(raw.states?.[role]) ? raw.states[role] : []
    )
  );
}

function uniqueFrameNames(frames) {
  const used = new Set();
  const clean = [];
  for (const frame of frames) {
    let name = String(frame.name ?? '').trim() || 'Fotograma';
    if (used.has(name.toLowerCase())) {
      let base = name.replace(/\s+copia(?:\s+\d+)?$/i, '').replace(/\s+\d+$/, '').trim() || 'Fotograma';
      if (/^f\d+$/i.test(base)) base = 'F';
      if (base.toUpperCase() === 'F') {
        const largest = clean.reduce((max, item) => {
          const match = /^f(\d+)$/i.exec(item.name.trim());
          return match ? Math.max(max, Number(match[1])) : max;
        }, 0);
        let number = largest + 1;
        name = `F${number}`;
        while (used.has(name.toLowerCase())) name = `F${++number}`;
      } else {
        let number = 2;
        name = `${base} ${number}`;
        while (used.has(name.toLowerCase())) name = `${base} ${++number}`;
      }
    }
    used.add(name.toLowerCase());
    clean.push({ ...frame, name });
  }
  return clean;
}

export function normaliseComposition(raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  let frames;
  if (Array.isArray(raw.frames) && raw.frames.length) {
    frames = raw.frames.map((frame, index) => ({
      id: typeof frame?.id === 'string' && frame.id ? frame.id : nextId('frm'),
      name: typeof frame?.name === 'string' && frame.name ? frame.name : `Fotograma ${index + 1}`,
      duration: Math.max(50, Math.min(10000, Number(frame?.duration) || 400)),
      children: Array.isArray(frame?.children)
        ? frame.children.map(normaliseCompositionChild).filter(Boolean)
        : []
    }));
  } else if (raw.states) {
    frames = legacyFrames(raw);
  } else {
    frames = [createFrame('Fotograma 1')];
  }

  const preset = COMPOSITION_PRESETS.includes(raw.preset)
    ? raw.preset
    : raw.states
      ? 'button'
      : 'blank';
  frames = frames.slice(0, compositionFrameLimit(preset));
  if (preset === 'button') {
    const roles = ['inactivo', 'hover', 'pulsado'];
    while (frames.length < 3) {
      frames.push(createFrame(roles[frames.length]));
    }
    frames = frames.map((frame, index) => ({ ...frame, name: roles[index] }));
  }
  if (preset === 'animation') {
    frames = frames.map((frame) => {
      const match = /^fotograma\s+(\d+)$/i.exec(frame.name.trim());
      return match ? { ...frame, name: `F${match[1]}` } : frame;
    });
  }

  frames = uniqueFrameNames(frames);
  const ids = new Set(frames.map((frame) => frame.id));
  const first = frames[0].id;
  const interactive = (value, fallback) => (ids.has(value) ? value : fallback);
  const interactions = preset === 'button'
    ? {
        hover: frames[1]?.id ?? first,
        pressed: frames[2]?.id ?? frames[1]?.id ?? first
      }
    : {
        hover: interactive(raw.interactions?.hover, first),
        pressed: interactive(raw.interactions?.pressed, first)
      };
  return {
    preset,
    frames,
    interactions,
    timeline: {
      autoplay: Boolean(raw.timeline?.autoplay) && frames.length > 1,
      loop: raw.timeline?.loop !== false
    }
  };
}

export function frameById(composition, frameId) {
  const clean = normaliseComposition(composition);
  return clean.frames.find((frame) => frame.id === frameId) ?? clean.frames[0];
}

export function compositionFrameChildren(composition, frameId, fallback = false) {
  const clean = normaliseComposition(composition);
  const frame = clean.frames.find((item) => item.id === frameId);
  if (frame) return frame.children;
  const first = clean.frames[0];
  return fallback ? (first?.children ?? []) : [];
}

function hasVisibleChildren(frame) {
  return (frame?.children ?? []).some((child) => !child.hidden);
}

export function interactiveFrameId(composition, role) {
  const clean = normaliseComposition(composition);
  const first = clean.frames[0];
  const frameFor = (frameId) =>
    clean.frames.find((frame) => frame.id === frameId) ?? first;
  if (role === 'pressed') {
    const pressed = frameFor(clean.interactions.pressed);
    if (pressed.id !== first.id && hasVisibleChildren(pressed)) return pressed.id;
    const hover = frameFor(clean.interactions.hover);
    return hover.id !== first.id && hasVisibleChildren(hover) ? hover.id : first.id;
  }
  if (role === 'hover') {
    const hover = frameFor(clean.interactions.hover);
    return hover.id !== first.id && hasVisibleChildren(hover) ? hover.id : first.id;
  }
  return first.id;
}

export function compositionChildStyle(child) {
  return `left:${child.frame.x}%;top:${child.frame.y}%;width:${child.frame.w}%;height:${child.frame.h}%;transform:rotate(${child.frame.rotation ?? 0}deg);opacity:${child.opacity ?? 1};`;
}
