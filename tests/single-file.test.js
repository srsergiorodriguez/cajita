import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { appendPage } from '../src/lib/domain/pages.js';
import { createElement } from '../src/lib/domain/elements.js';
import { buildSingleFile } from '../src/lib/export/single-file.js';

describe('single-file export', () => {
  it('keeps movable fichas and page transitions in the single file', () => {
    const project = createProject({ title: 'Archivo', locale: 'es' });
    project.fichaSettings.movable = true;
    project.pages[0].transition = 'fade';
    const html = buildSingleFile(project, {
      assetHref: () => '',
      builtinHref: () => '',
      customHref: () => '',
      fontFaces: []
    });
    expect(html).toContain('data-ficha-project="' + project.id + '"');
    expect(html).toContain('__cajitaFichasRefresh');
    expect(html).toContain('sf-transition-fade');
    expect(html).toContain('data-transition="fade"');
  });

  it('inlines pages, assets, and a hash router', () => {
    const project = createProject({ title: 'Archivo', locale: 'es' });
    const start = project.pages[0];
    const about = appendPage(project, { title: 'Sobre' });
    project.assets.a_1 = {
      id: 'a_1',
      hash: 'abcdef',
      kind: 'image',
      name: 'retrato.png',
      mime: 'image/png',
      bytes: 10
    };
    const link = createElement('text', {
      project,
      page: start,
      text: 'Ir a sobre'
    });
    link.link = { kind: 'page', pageId: about.id };
    start.elements.push(link);
    start.elements.push(
      createElement('image', { project, page: start, asset: project.assets.a_1 })
    );
    const html = buildSingleFile(project, {
      assetHref: () => 'data:image/png;base64,AAAA',
      builtinHref: () => '',
      customHref: () => '',
      fontFaces: []
    });
    expect(html).toContain('data-page-slug="inicio"');
    expect(html).toContain('data-page-slug="sobre"');
    expect(html).toContain('data-cajita-page="' + about.id + '"');
    expect(html).toContain('data:image/png;base64,AAAA');
    expect(html).toContain('.sf-page.is-active');
    expect(html).toContain('addEventListener(\'click\'');
    expect(html).toContain('<title>Archivo</title>');
  });
});
