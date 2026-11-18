import { describe, expect, it } from 'vitest';
import {
  addStroke,
  createDrawing,
  normalizeDrawing,
  renderDrawingFrames,
  renderFrameIndices
} from '../src/lib/drawing/model.js';
import { encodeDrawingGif } from '../src/lib/drawing/encode.js';

const stroke = {
  id: 's1',
  tool: 'brush',
  paint: 2,
  size: 3,
  points: [[20, 20], [100, 100]],
  seed: 7
};

describe('drawing model', () => {
  it('creates three animated frames and one static frame', () => {
    expect(renderDrawingFrames(createDrawing())).toHaveLength(3);
    const staticDrawing = createDrawing({ animated: false });
    expect(staticDrawing.animated).toBe(false);
    expect(renderDrawingFrames(staticDrawing)).toHaveLength(1);
    expect(staticDrawing.delay).toBe(0);
  });

  it('normalizes strokes and static drawings', () => {
    const normalized = normalizeDrawing({
      animated: false,
      strokes: [stroke, { tool: 'fill', points: [[1, 1]] }]
    });
    expect(normalized.animated).toBe(false);
    expect(normalized.frames).toBe(1);
    expect(normalized.strokes).toHaveLength(1);
  });

  it('supports arbitrary canvas dimensions and new tools', () => {
    const wide = createDrawing({ width: 192, height: 96, animated: false });
    wide.strokes.push({ ...stroke, tool: 'line' }, { ...stroke, tool: 'spray' });
    expect(wide.width).toBe(192);
    expect(wide.height).toBe(96);
    expect(renderFrameIndices(wide, 0)).toHaveLength(192 * 96);
    expect(renderDrawingFrames(wide)).toHaveLength(1);
    const normalized = normalizeDrawing({ width: 64, height: 192, strokes: [stroke] });
    expect(normalized.width).toBe(64);
    expect(normalized.height).toBe(192);
  });

  it('marks transparent GIFs with the transparent-color flag', () => {
    const transparent = addStroke(
      createDrawing({ animated: false, transparent: true }),
      stroke
    );
    const gif = encodeDrawingGif(transparent, {
      outputSize: 128,
      projectColors: ['#fffdf7', '#1c1917', '#a82a1e', '#d9a441', '#2e5a88']
    });
    const bytes = Buffer.from(gif.image.split(',')[1], 'base64');
    let control = -1;
    for (let index = 0; index < bytes.length - 1; index += 1) {
      if (bytes[index] === 0x21 && bytes[index + 1] === 0xf9) {
        control = index;
        break;
      }
    }
    expect(control).toBeGreaterThan(-1);
    expect(bytes[control + 3] & 1).toBe(1);
  });

  it('normalizes authored animation frames without boiling', () => {
    const animated = normalizeDrawing({
      animated: true,
      animation: {
        delay: 120,
        frames: [
          { id: 'f1', strokes: [stroke] },
          { id: 'f2', strokes: [] }
        ]
      }
    });
    expect(animated.frames).toBe(2);
    expect(animated.delay).toBe(120);
    expect(animated.animation.frames).toHaveLength(2);
    expect(animated.animation.frames[0].duration).toBe(750);
    expect(renderDrawingFrames(animated)).toHaveLength(6);
    expect(renderFrameIndices(animated, 0)).toContain(2);
    expect(renderFrameIndices(animated, 3)).not.toContain(2);
  });

  it('renders deterministic palette indices and encodes a GIF', () => {
    const drawing = addStroke(createDrawing(), stroke);
    const first = renderFrameIndices(drawing, 0);
    const second = renderFrameIndices(drawing, 0);
    expect(Array.from(first)).toEqual(Array.from(second));
    expect(first).toContain(2);
    const gif = encodeDrawingGif(drawing, {
      outputSize: 128,
      projectColors: ['#fffdf7', '#1c1917', '#a82a1e', '#d9a441', '#2e5a88']
    });
    expect(gif.image).toMatch(/^data:image\/gif;base64,/);
    expect(gif.image).toBe(
      encodeDrawingGif(drawing, {
        outputSize: 128,
        projectColors: ['#fffdf7', '#1c1917', '#a82a1e', '#d9a441', '#2e5a88']
      }).image
    );
  });
});
