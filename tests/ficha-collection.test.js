import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { createFichaField, createFichaRecord } from '../src/lib/domain/fichas.js';
import { createElement } from '../src/lib/domain/elements.js';
import {
  fichaCollectionRecords,
  normaliseFichaCollection
} from '../src/lib/domain/ficha-collection.js';
import { buildSite } from '../src/lib/export/site.js';

function fixture() {
  const project = createProject({ title: 'Archivo', locale: 'es' });
  project.fichaSchema.fields = [
    createFichaField({ id: 'fld_author', label: 'Autor', key: 'autor' }),
    createFichaField({ id: 'fld_year', label: 'Año', key: 'anio' })
  ];
  project.fichas.f_2 = createFichaRecord({
    id: 'f_2',
    code: 'OBJ-002',
    label: 'Bosque',
    values: { fld_author: 'Ana', fld_year: '2024' }
  });
  project.fichas.f_1 = createFichaRecord({
    id: 'f_1',
    code: 'OBJ-001',
    label: 'Casa',
    values: { fld_author: 'Sergio', fld_year: '2025' }
  });
  return project;
}

describe('ficha collection', () => {
  it('normalizes config and sorts records', () => {
    const project = fixture();
    const config = normaliseFichaCollection({
      columns: 9,
      sort: 'label',
      filterFieldIds: ['fld_author', 'fld_author', 'missing'],
      search: false
    });
    expect(config.columns).toBe(6);
    expect(config.sort).toBe('label');
    expect(config.filterFieldIds).toEqual(['fld_author', 'missing']);
    expect(config.search).toBe(false);
    expect(fichaCollectionRecords(project, config).map((record) => record.label)).toEqual([
      'Bosque',
      'Casa'
    ]);
  });

  it('exports searchable cards and filter controls', () => {
    const project = fixture();
    const element = createElement('fichaCollection', {
      project,
      page: project.pages[0],
      collection: { filterFieldIds: ['fld_author'], columns: 2 }
    });
    project.pages[0].elements.push(element);
    const site = buildSite(project);
    const html = site.pages[0].html;
    expect(html).toContain('data-ficha-collection');
    expect(html).toContain('data-ficha-search');
    expect(html).toContain('data-ficha-filter="autor"');
    expect(html).toContain('data-ficha-card');
    expect(html).toContain('data-ficha-field-autor="ana"');
    expect(html).toContain('--ficha-columns:2');
  });
});
