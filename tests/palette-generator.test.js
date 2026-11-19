import { describe, expect, it } from 'vitest';
import { contrastRatio, generatePalette } from '../src/lib/domain/palette-generator.js';

function seeded(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('palette generator', () => {
  it('generates five valid role-aware colors with readable text', () => {
    const colors = generatePalette({
      project: { palette: ['#fffdf7', '#1c1917', '#a82a1e', '#d9a441', '#2e5a88'] },
      random: seeded([0.5, 0.3, 0.7, 0.2, 0.9, 0.4, 0.6, 0.8, 0.1, 0.55])
    });
    expect(colors).toHaveLength(5);
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(colors[1], colors[0])).toBeGreaterThanOrEqual(4.5);
  });

  it('preserves locked colors', () => {
    const project = { palette: ['#ffffff', '#111111', '#ff0000', '#00ff00', '#0000ff'] };
    const colors = generatePalette({
      project,
      locked: [0, 2],
      random: seeded([0.5, 0.3, 0.7, 0.2, 0.9, 0.4, 0.6, 0.8])
    });
    expect(colors[0]).toBe('#ffffff');
    expect(colors[2]).toBe('#ff0000');
    expect(colors[1]).not.toBe('#111111');
  });
});
