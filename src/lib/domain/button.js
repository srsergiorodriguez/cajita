export const BUTTON_STATES = Object.freeze(['idle', 'hover', 'pressed']);
export const BUTTON_CHILD_TYPES = Object.freeze(['shape', 'text', 'image', 'drawing']);

export const DEFAULT_BUTTON = Object.freeze({
  states: { idle: [], hover: [], pressed: [] }
});

function clampFrame(frame = {}) {
  return {
    x: Math.max(0, Math.min(100, Number(frame.x) || 0)),
    y: Math.max(0, Math.min(100, Number(frame.y) || 0)),
    w: Math.max(1, Math.min(100, Number(frame.w) || 30)),
    h: Math.max(1, Math.min(100, Number(frame.h) || 30)),
    rotation: Number(frame.rotation) || 0
  };
}

export function createButtonChild(type = 'text', options = {}) {
  const frame = clampFrame(options.frame ?? { x: 25, y: 25, w: 50, h: 50 });
  const base = {
    id: options.id ?? `bc_${Math.random().toString(36).slice(2, 10)}`,
    type,
    frame,
    opacity: options.opacity ?? 1
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
      fit: options.fit === 'contain' ? 'contain' : 'cover',
      pixelated: Boolean(options.pixelated),
      alt: options.alt ?? ''
    };
  }
  return {
    ...base,
    text: options.text ?? 'Botón',
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

export function normaliseButtonChild(child) {
  if (!child || !BUTTON_CHILD_TYPES.includes(child.type)) return null;
  return createButtonChild(child.type, child);
}

export function normaliseButton(raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const states = {};
  for (const state of BUTTON_STATES) {
    states[state] = Array.isArray(raw.states?.[state])
      ? raw.states[state].map(normaliseButtonChild).filter(Boolean)
      : [];
  }
  return { states };
}

export function buttonState(button, state = 'idle') {
  const normal = normaliseButton(button);
  if (state === 'pressed') {
    return normal.states.pressed.length
      ? normal.states.pressed
      : normal.states.hover.length
        ? normal.states.hover
        : normal.states.idle;
  }
  if (state === 'hover') {
    return normal.states.hover.length ? normal.states.hover : normal.states.idle;
  }
  return normal.states.idle;
}

export function buttonChildStyle(child) {
  return `left:${child.frame.x}%;top:${child.frame.y}%;width:${child.frame.w}%;height:${child.frame.h}%;transform:rotate(${child.frame.rotation ?? 0}deg);opacity:${child.opacity ?? 1};`;
}
