// @ts-check

/** @param {unknown} value
 * @returns {value is Record<string, any>} */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export const DRAWING_WIDTH = 128;
export const DRAWING_HEIGHT = 128;
export const DRAWING_FRAMES = 3;
export const DRAWING_STATIC_FRAMES = 1;
export const DRAWING_DELAY = 25; // 250ms = 4 fps
export const DRAWING_OUTPUT_SIZE = 1024;
export const DRAWING_VERSION = 1;

/** @typedef {'brush'|'texture'|'eraser'} DrawingTool */

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
 * @property {number} size   // 1..6, mapped to 2/4/6/8/10/12 internal pixels
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
 * @property {number} frames
 * @property {number} delay
 */

/** @param {number} value */
function clampPoint(value) {
  return Math.max(0, Math.min(DRAWING_WIDTH - 1, Math.round(value)));
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
  return [1, 2, 3, 4, 5, 6][Math.max(1, Math.min(6, Math.round(size))) - 1];
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
 * @param {{ strokes?: DrawingStroke[], animated?: boolean }} [input]
 * @returns {DrawingDoc}
 */
export function createDrawing(input = {}) {
  const animated = input.animated !== false;
  return {
    version: DRAWING_VERSION,
    width: DRAWING_WIDTH,
    height: DRAWING_HEIGHT,
    strokes: Array.isArray(input.strokes) ? input.strokes : [],
    animated,
    frames: animated ? DRAWING_FRAMES : DRAWING_STATIC_FRAMES,
    delay: animated ? DRAWING_DELAY : 0,
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
  if (!Array.isArray(raw.strokes)) return null;

  /** @type {DrawingStroke[]} */
  const strokes = [];
  for (const stroke of raw.strokes) {
    if (!isPlainObject(stroke)) continue;
    const tool = stroke.tool;
    if (tool !== 'brush' && tool !== 'texture' && tool !== 'eraser') continue;
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
    const size = Math.max(1, Math.min(6, Math.round(Number(stroke.size) || 2)));
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

  const animated = raw.animated !== false;
  return {
    version: DRAWING_VERSION,
    width: DRAWING_WIDTH,
    height: DRAWING_HEIGHT,
    strokes,
    animated,
    frames: animated ? DRAWING_FRAMES : DRAWING_STATIC_FRAMES,
    delay: animated ? DRAWING_DELAY : 0,
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
 */
function stamp(pixels, x, y, radius, value, texture) {
  const r = Math.max(0, radius);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= DRAWING_WIDTH || py >= DRAWING_HEIGHT) {
        continue;
      }
      if (texture && (px + py) % 2 !== 0) continue;
      pixels[py * DRAWING_WIDTH + px] = value;
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
 */
function stampLine(pixels, x0, y0, x1, y1, radius, value, texture) {
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
    );
  }
}

/**
 * Render one frame as palette indices (0 = background, 1..4 = paints).
 *
 * @param {DrawingDoc} drawing
 * @param {number} frameIndex
 * @returns {Uint8Array}
 */
export function renderFrameIndices(drawing, frameIndex) {
  const frameCount = drawing.frames === 1 ? 1 : DRAWING_FRAMES;
  const frame = ((Math.round(frameIndex) % frameCount) + frameCount) % frameCount;
  const pixels = new Uint8Array(DRAWING_WIDTH * DRAWING_HEIGHT);

  for (const stroke of drawing.strokes) {
    const rng = mulberry32((stroke.seed ^ ((frame + 1) * 0x9e3779b9)) >>> 0);
    const radius = Math.max(1, radiusFor(stroke.size));
    const value = stroke.tool === 'eraser' ? 0 : stroke.paint;
    const texture = stroke.tool === 'texture';

    // Keep the boil legible but calm: move the whole stroke by at most one
    // internal pixel per frame, and only rarely nudge a single point. The old
    // per-point ±1 jitter made short strokes look jagged rather than wiggly.
    const shiftX = rng() < 0.55 ? 0 : rng() < 0.5 ? -1 : 1;
    const shiftY = rng() < 0.55 ? 0 : rng() < 0.5 ? -1 : 1;

    let previous = null;
    for (const point of stroke.points) {
      const wobbleX = rng() < 0.1 ? (rng() < 0.5 ? -1 : 1) : 0;
      const wobbleY = rng() < 0.1 ? (rng() < 0.5 ? -1 : 1) : 0;
      const x = clampPoint(point[0] + shiftX + wobbleX);
      const y = clampPoint(point[1] + shiftY + wobbleY);
      if (previous) {
        stampLine(pixels, previous[0], previous[1], x, y, radius, value, texture);
      } else {
        stamp(pixels, x, y, radius, value, texture);
      }
      previous = [x, y];
    }
  }

  return pixels;
}

/**
 * @param {DrawingDoc} drawing
 * @returns {Uint8Array[]}
 */
export function renderDrawingFrames(drawing) {
  const count = drawing.frames === 1 ? 1 : DRAWING_FRAMES;
  return Array.from({ length: count }, (_, frame) =>
    renderFrameIndices(drawing, frame),
  );
}

/**
 * Expand a 128×128 index frame to RGBA at the requested output size, using
 * nearest-neighbor scaling so the exported GIF has exactly the project scheme colors.
 *
 * @param {Uint8Array} indices
 * @param {string[]} projectColors
 * @param {number} outputSize
 * @param {Uint8ClampedArray} [target]
 * @returns {Uint8ClampedArray}
 */
export function frameToRgba(indices, projectColors, outputSize, target) {
  const colors = paletteRgb(projectColors);
  const scale = outputSize / DRAWING_WIDTH;
  const width = DRAWING_WIDTH * scale;
  const height = DRAWING_HEIGHT * scale;
  const rgba = target || new Uint8ClampedArray(width * height * 4);

  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error('Drawing output size must be an integer multiple of 128');
  }

  for (let y = 0; y < height; y++) {
    const sourceY = Math.floor(y / scale);
    for (let x = 0; x < width; x++) {
      const sourceX = Math.floor(x / scale);
      const color = colors[indices[sourceY * DRAWING_WIDTH + sourceX]] || colors[0];
      const index = (y * width + x) * 4;
      rgba[index] = color[0];
      rgba[index + 1] = color[1];
      rgba[index + 2] = color[2];
      rgba[index + 3] = 255;
    }
  }

  return rgba;
}
