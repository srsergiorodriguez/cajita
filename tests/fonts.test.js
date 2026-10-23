import { describe, expect, it } from 'vitest';
import {
  canAddFont,
  fontFamily,
  fontNameExists,
  fontUsage,
  validateFontFile
} from '../src/lib/domain/fonts.js';
import { LIMITS } from '../src/lib/domain/model.js';

const woff2 = new Uint8Array(64);
woff2.set(new TextEncoder().encode('wOF2'));

describe('custom fonts', () => {
  it('accepts a WOFF2 file under the limit', () => {
    const result = validateFontFile({ name: 'mi-tipo.woff2', bytes: woff2 });
    expect(result.ok).toBe(true);
    expect(result.format).toBe('woff2');
    expect(result.mime).toBe('font/woff2');
  });

  it('rejects an unknown binary', () => {
    const result = validateFontFile({
      name: 'no-es-tipo.woff2',
      bytes: new Uint8Array([1, 2, 3, 4])
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('ASSET_UNSUPPORTED');
  });

  it('rejects a font over 5 MB', () => {
    const big = new Uint8Array(LIMITS.fontBytes + 1);
    big.set(new TextEncoder().encode('wOF2'));
    const result = validateFontFile({ name: 'grande.woff2', bytes: big });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('ASSET_TOO_LARGE');
  });

  it('knows when the project has no font slots left', () => {
    expect(canAddFont({ fonts: {} }).ok).toBe(true);
    const fonts = {
      f_1: { id: 'f_1', name: 'Uno' },
      f_2: { id: 'f_2', name: 'Dos' }
    };
    expect(canAddFont({ fonts }).ok).toBe(false);
  });

  it('checks unique names and creates CSS families', () => {
    const project = { fonts: { f_1: { id: 'f_1', name: 'Mi Tipo' } } };
    expect(fontNameExists(project, 'mi tipo')).toBe(true);
    expect(fontNameExists(project, 'mi tipo', 'f_1')).toBe(false);
    expect(fontFamily({ id: 'f_1' })).toBe('cajita-font-f_1');
  });

  it('counts font usage in text elements', () => {
    const project = {
      pages: [
        {
          elements: [
            { type: 'text', font: 'f_1' },
            { type: 'text', font: 'f_1' },
            { type: 'text', font: 'space-mono' }
          ]
        }
      ]
    };
    expect(fontUsage(project, 'f_1')).toBe(2);
  });
});
