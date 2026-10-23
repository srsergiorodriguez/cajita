import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import {
  appendPage,
  deletePage,
  duplicatePage,
  moveElementLayer,
  setElementOrder,
  renamePageSlug,
  renamePageTitle,
  setStartPage
} from '../src/lib/domain/pages.js';
import { createElement } from '../src/lib/domain/elements.js';

function project() {
  return createProject({ title: 'Proyecto', stagePreset: 'wide' });
}

describe('page commands', () => {
  it('appends a page with a unique slug', () => {
    const p = project();
    const page = appendPage(p, { title: 'Sobre mí' });
    expect(p.pages).toHaveLength(2);
    expect(page.slug).toBe('sobre-mi');
    expect(page.elements).toEqual([]);
  });

  it('renames a title without changing the slug', () => {
    const p = project();
    const page = p.pages[0];
    renamePageTitle(p, page.id, 'Portada');
    expect(page.title).toBe('Portada');
    expect(page.slug).toBe('inicio');
  });

  it('renames a slug and records a redirect', () => {
    const p = project();
    const page = p.pages[0];
    renamePageSlug(p, page.id, 'entrada');
    expect(page.slug).toBe('entrada');
    expect(p.redirects).toContainEqual(
      expect.objectContaining({ from: 'inicio', toPageId: page.id })
    );
  });

  it('rejects a duplicate slug', () => {
    const p = project();
    appendPage(p, { title: 'Sobre' });
    expect(() => renamePageSlug(p, p.pages[0].id, 'sobre')).toThrow();
  });

  it('duplicates a page with new element IDs', () => {
    const p = project();
    p.pages[0].elements.push(
      createElement('text', { project: p, page: p.pages[0], text: 'Hola' })
    );
    const copy = duplicatePage(p, p.pages[0].id);
    expect(copy.id).not.toBe(p.pages[0].id);
    expect(copy.elements[0].id).not.toBe(p.pages[0].elements[0].id);
    expect(copy.slug).toBe('inicio-copia');
  });

  it('deletes a page and clears links that pointed to it', () => {
    const p = project();
    const second = appendPage(p, { title: 'Sobre' });
    const element = createElement('text', {
      project: p,
      page: p.pages[0],
      text: 'Hola'
    });
    element.link = { kind: 'page', pageId: second.id };
    p.pages[0].elements.push(element);
    const next = deletePage(p, second.id);
    expect(p.pages).toHaveLength(1);
    expect(next.id).toBe(p.pages[0].id);
    expect(element.link).toBe(null);
  });

  it('refuses to delete the last page', () => {
    const p = project();
    expect(() => deletePage(p, p.pages[0].id)).toThrow();
  });

  it('moves a page to start', () => {
    const p = project();
    const second = appendPage(p, { title: 'Sobre' });
    setStartPage(p, second.id);
    expect(p.startPageId).toBe(second.id);
  });
});

describe('layer order', () => {
  it('sets a full layer order and normalises z', () => {
    const page = { elements: [] };
    const a = createElement('text', { page, text: 'A' });
    const b = createElement('text', { page, text: 'B' });
    const c = createElement('text', { page, text: 'C' });
    page.elements = [a, b, c];
    setElementOrder(page, [c.id, a.id, b.id]);
    expect(page.elements.map((element) => element.id)).toEqual([c.id, a.id, b.id]);
    expect(page.elements.map((element) => element.z)).toEqual([2, 1, 0]);
  });

  it('swaps z values and normalises', () => {
    const page = { elements: [] };
    const a = createElement('text', { page, text: 'A' });
    const b = createElement('text', { page, text: 'B' });
    page.elements = [a, b];
    moveElementLayer(page, b.id, -1);
    expect(page.elements[0].id).toBe(b.id);
    expect(page.elements.map((element) => element.z)).toEqual([0, 1]);
  });
});
