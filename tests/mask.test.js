import { describe, expect, it } from 'vitest';
import { maskClipPath, normaliseMask } from '../src/lib/domain/mask.js';

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
});
