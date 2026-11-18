import { describe, expect, it } from 'vitest';
import { ensureDesign, colorForToken, textStyleValues, radiusTokenValue } from '../src/lib/domain/design.js';

describe('design tokens', () => {
  it('adds fixed color, text, and radius defaults without replacing existing ones', () => {
    const project = ensureDesign({ palette: ['#111111', '#222222', '#333333', '#444444', '#555555'] });
    expect(project.colorTokens).toHaveLength(5);
    expect(project.colorTokens.map((token) => token.name)).toEqual([
      'Fondo', 'Texto', 'Acento', 'Acento 2', 'Acento 3'
    ]);
    expect(project.textStyles['heading-1']).toBeTruthy();
    expect(project.radiusTokens.map((token) => token.value)).toEqual([0, 8, 25, 50]);

    const custom = ensureDesign({
      palette: project.palette,
      colorTokens: project.colorTokens,
      radiusTokens: [{ id: 'soft', name: 'Custom', value: 12 }],
      textStyles: { body: { ...project.textStyles.body, fontSize: 22 } }
    });
    expect(custom.radiusTokens[0].value).toBe(12);
    expect(custom.textStyles.body.fontSize).toBe(22);
    expect(custom.textStyles['heading-1']).toBeTruthy();
  });

  it('resolves colors, text styles, and radii', () => {
    const project = ensureDesign({
      palette: ['#ffffff', '#111111', '#ff0000', '#00ff00', '#0000ff']
    });
    expect(colorForToken(project, 'accent')).toBe('#ff0000');
    expect(textStyleValues(project, 'heading-1').color).toBe('#111111');
    expect(radiusTokenValue(project, 'round')).toBe(25);
  });
});
