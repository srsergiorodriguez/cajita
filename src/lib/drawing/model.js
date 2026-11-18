// @ts-check

/** @param {unknown} value
 * @returns {value is Record<string, any>} */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export const DRAWING_WIDTH = 128;
export const DRAWING_HEIGHT = 128;
export const DRAWING_MIN_SIZE = 16;
export const DRAWING_MAX_SIZE = 256;
export const DRAWING_FRAMES = 3;
export const DRAWING_STATIC_FRAMES = 1;
export const DRAWING_DELAY = 25; // GIF delay units (1/100 s)
export const DRAWING_DEFAULT_FRAME_MS = DRAWING_DELAY * 10;
export const DRAWING_DEFAULT_POSE_MS = DRAWING_DEFAULT_FRAME_MS * DRAWING_FRAMES;
export const DRAWING_OUTPUT_SIZE = 1024;
export const DRAWING_VERSION = 1;
export const DRAWING_MAX_FRAMES = 8;
export const DRAWING_MAX_BRUSH = 12;
const BRUSH_RADII = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22];

/** @typedef {'brush'|'line'|'spray'|'rect'|'chalk'|'texture'|'eraser'} DrawingTool */

/** Default scheme: the same Papel colors used by a new project. */
const FALLBACK_COLORS = Object.freeze([
  '#ffffff',
  '#000000',
  '#00bfff',
  '#ffd23f',
  '#ff5252',
]);

/**
 * @typedef {Object} DrawingStroke
 * @property {string} id
 * @property {DrawingTool} tool
 * @property {number} paint  // 1..4; ignored by eraser
 * @property {number} size   // 1..12, mapped to internal pixel radii
 * @property {number[][]} points // [[x,y], ...]
 * @property {number} seed
 */

/**
 * @typedef {Object} DrawingDoc
 * @property {number} version
 * @property {number} width
 * @property {number} height
 * @property {DrawingStroke[]} strokes
 * @property {boolean} animated
 * @property {boolean} transparent
 * @property {number} frames
 * @property {number} delay
 * @property {{ frames: { id: string, strokes: DrawingStroke[], duration: number }[], delay: number }} [animation]
 */

/** @param {number} value @param {number} [max] */
function clampPoint(value, max = Number.MAX_SAFE_INTEGER) {
  return Math.max(0, Math.min(max - 1, Math.round(value)));
}

/** @param {unknown} value @param {number} fallback */
function clampDimension(value, fallback) {
  return Math.max(
    DRAWING_MIN_SIZE,
    Math.min(DRAWING_MAX_SIZE, Math.round(Number(value) || fallback)),
  );
}

/**
 * Small deterministic PRNG. Jitter must never use Math.random(), otherwise the
 * same drawing would encode into different frames after reopening.
 *
 * @param {number} seed
 * @returns {() => number}
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number} size
 * @returns {number}
 */
function radiusFor(size) {
  return BRUSH_RADII[Math.max(1, Math.min(DRAWING_MAX_BRUSH, Math.round(size))) - 1];
}

/**
 * @param {string[]|null} [projectColors]
 * @returns {string[]}
 */
export function paletteColors(projectColors = null) {
  return Array.isArray(projectColors) && projectColors.length >= 5
    ? projectColors.slice(0, 5)
    : [...FALLBACK_COLORS];
}

/**
 * @param {string[]|null} [projectColors]
 * @returns {Array<[number, number, number]>}
 */
export function paletteRgb(projectColors = null) {
  return paletteColors(projectColors).map((hex) => {
    const value = hex.replace('#', '');
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  });
}

/**
 * @param {{ strokes?: DrawingStroke[], animated?: boolean, width?: number, height?: number, transparent?: boolean, animation?: { frames: { id?: string, strokes?: DrawingStroke[], duration?: number }[], delay?: number } }} [input]
 * @returns {DrawingDoc}
 */
export function createDrawing(input = {}) {
  const animation = normaliseAnimation(input.animation);
  const animated = animation ? true : input.animated !== false;
  return {
    version: DRAWING_VERSION,
    width: clampDimension(input.width, DRAWING_WIDTH),
    height: clampDimension(input.height, DRAWING_HEIGHT),
    strokes: Array.isArray(input.strokes) ? input.strokes : [],
    transparent: Boolean(input.transparent),
    animated,
    frames: animation ? animation.frames.length : animated ? DRAWING_FRAMES : DRAWING_STATIC_FRAMES,
    delay: animation ? animation.delay : animated ? DRAWING_DELAY : 0,
    ...(animation ? { animation } : {}),
  };
}

/** @param {unknown} raw @returns {DrawingStroke[]} */
function normaliseStrokes(raw) {
  /** @type {DrawingStroke[]} */
  const strokes = [];
  if (!Array.isArray(raw)) return strokes;
  for (const stroke of raw) {
    if (!isPlainObject(stroke)) continue;
    const tool = stroke.tool;
    if (tool !== 'brush' && tool !== 'line' && tool !== 'spray' && tool !== 'rect' && tool !== 'chalk' && tool !== 'texture' && tool !== 'eraser') continue;
    if (!Array.isArray(stroke.points) || stroke.points.length === 0) continue;
    const points = stroke.points
      .filter(
        (point) =>
          Array.isArray(point) &&
          point.length >= 2 &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1])),
      )
      .map((point) => [clampPoint(Number(point[0])), clampPoint(Number(point[1]))]);
    if (points.length === 0) continue;
    const paint = Math.max(1, Math.min(4, Math.round(Number(stroke.paint) || 1)));
    const size = Math.max(1, Math.min(DRAWING_MAX_BRUSH, Math.round(Number(stroke.size) || 2)));
    const seed = Number(stroke.seed);
    strokes.push({
      id: typeof stroke.id === 'string' ? stroke.id : `s${strokes.length + 1}`,
      tool,
      paint,
      size,
      points,
      seed: Number.isFinite(seed) ? seed >>> 0 : 1,
    });
  }
  return strokes;
}

/** @param {unknown} raw @returns {{ frames: { id: string, strokes: DrawingStroke[], duration: number }[], delay: number } | null} */
function normaliseAnimation(raw) {
  if (!isPlainObject(raw) || !Array.isArray(raw.frames) || raw.frames.length === 0) return null;
  const frames = raw.frames.slice(0, DRAWING_MAX_FRAMES).map((frame, index) => ({
    id: isPlainObject(frame) && typeof frame.id === 'string' ? frame.id : `f${index + 1}`,
    strokes: normaliseStrokes(isPlainObject(frame) ? frame.strokes : []),
    duration: Math.max(
      20,
      Math.min(10000, Math.round(
        Number(isPlainObject(frame) ? frame.duration : 0) || DRAWING_DEFAULT_POSE_MS,
      )),
    ),
  }));
  return {
    frames,
    delay: Math.max(20, Math.min(2000, Math.round(Number(raw.delay) || DRAWING_DELAY))),
  };
}

/**
 * Recover an editable source from a project. Invalid fields fall back to the
 * studio defaults; malformed individual strokes are dropped rather than
 * preventing the image from being opened.
 *
 * @param {unknown} raw
 * @returns {DrawingDoc|null}
 */
export function normalizeDrawing(raw) {
  if (!isPlainObject(raw)) return null;
  const animation = normaliseAnimation(raw.animation);
  if (!Array.isArray(raw.strokes) && !animation) return null;
  const strokes = normaliseStrokes(raw.strokes);
  const animated = animation ? true : raw.animated !== false;
  return {
    version: DRAWING_VERSION,
    width: clampDimension(raw.width, DRAWING_WIDTH),
    height: clampDimension(raw.height, DRAWING_HEIGHT),
    strokes,
    transparent: Boolean(raw.transparent),
    animated,
    frames: animation ? animation.frames.length : animated ? DRAWING_FRAMES : DRAWING_STATIC_FRAMES,
    delay: animation ? animation.delay : animated ? DRAWING_DELAY : 0,
    ...(animation ? { animation } : {}),
  };
}

/**
 * @param {DrawingDoc} drawing
 * @param {DrawingStroke} stroke
 * @returns {DrawingDoc}
 */
export function addStroke(drawing, stroke) {
  return { ...drawing, strokes: [...drawing.strokes, stroke] };
}

/**
 * @param {DrawingDoc} drawing
 * @returns {DrawingDoc}
 */
export function clearDrawing(drawing) {
  return { ...drawing, strokes: [] };
}

/**
 * @param {Uint8Array} pixels
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {number} value
 * @param {boolean} texture
 * @param {number} width
 * @param {number} height
 */
function stamp(pixels, x, y, radius, value, texture, width, height) {
  const r = Math.max(0, radius);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= width || py >= height) {
        continue;
      }
      if (texture && (px + py) % 2 !== 0) continue;
      pixels[py * width + px] = value;
    }
  }
}

/**
 * @param {Uint8Array} pixels
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {number} radius
 * @param {number} value
 * @param {boolean} texture
 * @param {number} width
 * @param {number} height
 */
function stampLine(pixels, x0, y0, x1, y1, radius, value, texture, width, height) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    stamp(
      pixels,
      Math.round(x0 + dx * t),
      Math.round(y0 + dy * t),
      radius,
      value,
      texture,
      width,
      height,
    );
  }
}

/**
 * Render one palette-index frame.
 *
 * Timeline drawings use their authored frame strokes without jitter. Legacy
 * single-drawing documents retain the deterministic boil behavior.
 *
 * @param {DrawingDoc} drawing
 * @param {number} frameIndex
 * @returns {Uint8Array}
 */
export function renderFrameIndices(drawing, frameIndex) {
  const authored = drawing.animation?.frames ?? [];
  const wiggleCount = drawing.animated !== false ? DRAWING_FRAMES : 1;
  const count = authored.length
    ? authored.length * wiggleCount
    : drawing.frames === 1
      ? 1
      : DRAWING_FRAMES;
  const frame = ((Math.round(frameIndex) % count) + count) % count;
  const width = drawing.width || DRAWING_WIDTH;
  const height = drawing.height || DRAWING_HEIGHT;
  const pixels = new Uint8Array(width * height);
  if (authored.length) {
    const authoredFrame = authored[Math.floor(frame / wiggleCount)];
    const variant = frame % wiggleCount;
    renderStrokes(pixels, authoredFrame?.strokes ?? [], variant, drawing.animated !== false, width, height);
  } else {
    renderStrokes(pixels, drawing.strokes, frame, drawing.animated !== false, width, height);
  }
  return pixels;
}

/** @param {Uint8Array} pixels @param {DrawingStroke[]} strokes @param {number} frame @param {boolean} jitter @param {number} width @param {number} height */
function renderStrokes(pixels, strokes, frame, jitter, width, height) {
  for (const stroke of strokes) {
    const rng = mulberry32((stroke.seed ^ ((frame + 1) * 0x9e3779b9)) >>> 0);
    const radius = Math.max(1, radiusFor(stroke.size));
    const value = stroke.tool === 'eraser' ? 0 : stroke.paint;
    const texture = stroke.tool === 'texture';
    if (stroke.tool === 'spray') {
      const density = 4 + radius * 2;
      for (const point of stroke.points) {
        for (let dot = 0; dot < density; dot += 1) {
          const angle = rng() * Math.PI * 2;
          const spread = Math.sqrt(rng()) * (radius + 2);
          stamp(
            pixels,
            clampPoint(point[0] + Math.cos(angle) * spread, width),
            clampPoint(point[1] + Math.sin(angle) * spread, height),
            1,
            value,
            false,
            width,
            height,
          );
        }
      }
      continue;
    }
    if (stroke.tool === 'chalk') {
      let previous = null;
      for (const point of stroke.points) {
        const x = clampPoint(point[0], width);
        const y = clampPoint(point[1], height);
        if (previous) {
          stampLine(
            pixels,
            previous[0],
            previous[1],
            x,
            y,
            Math.max(1, radius - 1),
            value,
            true,
            width,
            height,
          );
        } else {
          stamp(pixels, x, y, radius, value, true, width, height);
        }
        // A few loose flecks keep the chalk edge dusty without turning it
        // into the scattered-dot spray tool.
        for (let fleck = 0; fleck < 3; fleck += 1) {
          const angle = rng() * Math.PI * 2;
          const spread = radius + 1 + rng() * 2;
          stamp(
            pixels,
            clampPoint(x + Math.cos(angle) * spread, width),
            clampPoint(y + Math.sin(angle) * spread, height),
            1,
            value,
            false,
            width,
            height,
          );
        }
        previous = [x, y];
      }
      continue;
    }
    if (stroke.tool === 'rect') {
      const first = stroke.points[0];
      const last = stroke.points[stroke.points.length - 1];
      if (!first || !last) continue;
      const x0 = clampPoint(first[0], width);
      const y0 = clampPoint(first[1], height);
      const x1 = clampPoint(last[0], width);
      const y1 = clampPoint(last[1], height);
      stampLine(pixels, x0, y0, x1, y0, radius, value, texture, width, height);
      stampLine(pixels, x1, y0, x1, y1, radius, value, texture, width, height);
      stampLine(pixels, x1, y1, x0, y1, radius, value, texture, width, height);
      stampLine(pixels, x0, y1, x0, y0, radius, value, texture, width, height);
      continue;
    }
    const strokePoints =
      stroke.tool === 'line' && stroke.points.length > 1
        ? [stroke.points[0], stroke.points[stroke.points.length - 1]]
        : stroke.points;
    const shiftX = jitter && rng() < 0.8 ? 0 : jitter && rng() < 0.5 ? -1 : jitter ? 1 : 0;
    const shiftY = jitter && rng() < 0.8 ? 0 : jitter && rng() < 0.5 ? -1 : jitter ? 1 : 0;
    let previous = null;
    for (const point of strokePoints) {
      const wobbleX = jitter && rng() < 0.04 ? (rng() < 0.5 ? -1 : 1) : 0;
      const wobbleY = jitter && rng() < 0.04 ? (rng() < 0.5 ? -1 : 1) : 0;
      const x = clampPoint(point[0] + shiftX + wobbleX, width);
      const y = clampPoint(point[1] + shiftY + wobbleY, height);
      if (previous) stampLine(pixels, previous[0], previous[1], x, y, radius, value, texture, width, height);
      else stamp(pixels, x, y, radius, value, texture, width, height);
      previous = [x, y];
    }
  }
}

/**
 * @param {DrawingDoc} drawing
 * @returns {Uint8Array[]}
 */
export function renderDrawingFrames(drawing) {
  const authored = drawing.animation?.frames ?? [];
  const wiggleCount = drawing.animated !== false ? DRAWING_FRAMES : 1;
  const count = authored.length
    ? authored.length * wiggleCount
    : drawing.frames === 1
      ? 1
      : DRAWING_FRAMES;
  return Array.from({ length: count }, (_, frame) => renderFrameIndices(drawing, frame));
}

/**
 * Expand a 128×128 index frame to RGBA at the requested output size, using
 * nearest-neighbor scaling so the exported GIF has exactly the project scheme colors.
 *
 * @param {Uint8Array} indices
 * @param {string[]} projectColors
 * @param {number} outputWidth
 * @param {number} [outputHeight]
 * @param {number} [sourceWidth]
 * @param {number} [sourceHeight]
 * @param {Uint8ClampedArray|null} [target]
 * @returns {Uint8ClampedArray}
 */
export function frameToRgba(
  indices,
  projectColors,
  outputWidth,
  outputHeight = outputWidth,
  sourceWidth = DRAWING_WIDTH,
  sourceHeight = DRAWING_HEIGHT,
  target = null,
  transparent = false,
) {
  const colors = paletteRgb(projectColors);
  const rgba = target || new Uint8ClampedArray(outputWidth * outputHeight * 4);

  for (let y = 0; y < outputHeight; y++) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor((y / outputHeight) * sourceHeight));
    for (let x = 0; x < outputWidth; x++) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor((x / outputWidth) * sourceWidth));
      const colorIndex = indices[sourceY * sourceWidth + sourceX];
      const color = colors[colorIndex] || colors[0];
      const index = (y * outputWidth + x) * 4;
      rgba[index] = color[0];
      rgba[index + 1] = color[1];
      rgba[index + 2] = color[2];
      rgba[index + 3] = transparent && colorIndex === 0 ? 0 : 255;
    }
  }

  return rgba;
}
