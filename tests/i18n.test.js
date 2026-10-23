import { describe, expect, it } from 'vitest';
import { en } from '../src/lib/i18n/en.js';
import { es } from '../src/lib/i18n/es.js';

const placeholders = (value) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('i18n dictionaries', () => {
  it('have exactly the same keys', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('have no empty values', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), `en.${key}`).not.toBe('');
    }
    for (const [key, value] of Object.entries(es)) {
      expect(value.trim(), `es.${key}`).not.toBe('');
    }
  });

  it('use the same placeholders in both languages', () => {
    for (const key of Object.keys(en)) {
      expect(placeholders(es[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('keeps headings in sentence case, not Title Case', () => {
    const headings = [
      'settings.title',
      'settings.appearance',
      'settings.about',
      'inspector.page',
      'kitchen.title'
    ];
    for (const dictionary of [en, es]) {
      for (const key of headings) {
        const words = dictionary[key].split(/\s+/).slice(1);
        for (const word of words) {
          expect(word, `${key} must not be Title Case`).not.toMatch(/^[A-Z][a-z]/);
        }
      }
    }
  });
});
