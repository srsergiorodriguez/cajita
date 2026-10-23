import { describe, expect, it } from 'vitest';
import {
  isReservedSlug,
  isValidSlug,
  makeSlug,
  slugify
} from '../src/lib/domain/slugs.js';

describe('slugs.slugify', () => {
  it('transliterates Spanish accents and lowercases', () => {
    expect(slugify('Sobre mí')).toBe('sobre-mi');
    expect(slugify('Colección de objetos')).toBe('coleccion-de-objetos');
  });

  it('turns punctuation and whitespace into single hyphens', () => {
    expect(slugify('  Hola,   mundo!! ')).toBe('hola-mundo');
    expect(slugify('a/b\\c')).toBe('a-b-c');
  });

  it('never leaves path traversal characters', () => {
    const slug = slugify('../etc/passwd');
    expect(slug).toBe('etc-passwd');
    expect(slug).not.toContain('..');
    expect(slug).not.toContain('/');
  });

  it('returns an empty string for an empty input', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
  });
});

describe('slugs.makeSlug', () => {
  it('returns a safe fallback for empty titles', () => {
    expect(makeSlug('')).toBe('pagina');
  });

  it('suffixes collisions instead of overwriting', () => {
    expect(makeSlug('Sobre mí', ['sobre-mi'])).toBe('sobre-mi-2');
    expect(makeSlug('Sobre mí', ['sobre-mi', 'sobre-mi-2'])).toBe('sobre-mi-3');
  });

  it('moves reserved words out of the way', () => {
    expect(makeSlug('assets')).toBe('assets-pagina');
    expect(makeSlug('index')).toBe('index-pagina');
    expect(isReservedSlug('assets')).toBe(true);
  });

  it('always returns a valid slug', () => {
    const existing = [];
    for (const input of ['Inicio', 'Sobre mí', 'Colección', '404', '', 'a b c']) {
      const slug = makeSlug(input, existing);
      expect(isValidSlug(slug)).toBe(true);
      existing.push(slug);
    }
  });
});

describe('slugs.isValidSlug', () => {
  it('rejects reserved, empty, uppercase, and malformed slugs', () => {
    expect(isValidSlug('sobre-mi')).toBe(true);
    expect(isValidSlug('assets')).toBe(false);
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('Sobre')).toBe(false);
    expect(isValidSlug('-sobre')).toBe(false);
    expect(isValidSlug('sobre--mi')).toBe(false);
    expect(isValidSlug('../sobre')).toBe(false);
  });
});
