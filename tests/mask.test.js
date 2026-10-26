import { describe, expect, it } from 'vitest';
import {
  closestMaskOutline,
  closestMaskSegment,
  maskClipPath,
  normaliseMask,
  sampleMask
} from '../src/lib/domain/mask.js';

const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 }
];

describe('image mask', () => {
  it('normalises and clamps polygon points', () => {
    expect(normaliseMask([{ x: -5, y: 20 }, { x: 50, y: 100 }, { x: 120, y: 0 }])).toEqual([
      { x: 0, y: 20 },
      { x: 50, y: 100 },
      { x: 100, y: 0 }
    ]);
  });

  it('builds a clip path only for three-point polygons', () => {
    expect(maskClipPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe('');
    expect(maskClipPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }])).toBe(
      'polygon(0.000% 0.000%, 100.000% 0.000%, 50.000% 100.000%)'
    );
  });

  it('flattens a smooth closed curve into a portable polygon', () => {
    const sampled = sampleMask(square, { curve: true, steps: 4 });
    expect(sampled.length).toBe(16);
    expect(sampled[0]).toMatchObject({ x: 0, y: 0 });
    expect(sampled.every((point) => point.x >= 0 && point.x <= 100)).toBe(true);
    expect(maskClipPath(square, true).split(',').length).toBeGreaterThan(4);
  });

  it('finds the right segment for inserting a point', () => {
    const hit = closestMaskSegment(square, { x: 50, y: 2 }, 5);
    expect(hit).toMatchObject({ index: 0, x: 50, y: 0 });
    expect(closestMaskSegment(square, { x: 50, y: 50 }, 5)).toBeNull();
  });

  it('inserts against the smoothed outline, not the straight chord', () => {
    const bow = [
      { x: 0, y: 0 },
      { x: 50, y: 40 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ];
    expect(closestMaskOutline(bow, { x: 8.98, y: 2.03 }, 1.5, false)).toBeNull();
    expect(closestMaskOutline(bow, { x: 8.98, y: 2.03 }, 1.5, true)).toMatchObject({
      index: 0
    });
  });
});
