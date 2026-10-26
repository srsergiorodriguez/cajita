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
