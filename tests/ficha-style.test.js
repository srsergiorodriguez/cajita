import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FICHA_STYLE,
  normaliseFichaStyle
} from '../src/lib/domain/ficha-style.js';

describe('ficha card style', () => {
  it('normalises colors, fonts, and measurements', () => {
    expect(
      normaliseFichaStyle({
        background: '#ffffff',
        ink: '#111111',
        accent: '#ff0000',
        headingFont: 'anton',
        bodyFont: 'space-mono',
        borderWidth: 99,
        radius: -4
      })
    ).toEqual({
      background: '#ffffff',
      ink: '#111111',
      accent: '#ff0000',
      headingFont: 'anton',
      bodyFont: 'space-mono',
      borderWidth: 8,
      radius: 0
    });
  });

  it('falls back to the paper card style', () => {
    expect(normaliseFichaStyle(null)).toEqual(DEFAULT_FICHA_STYLE);
  });
});
