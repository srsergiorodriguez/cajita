import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { createElement } from '../src/lib/domain/elements.js';
import { migrateProject, validateProject } from '../src/lib/domain/project.js';
import {
  createFichaField,
  createFichaRecord,
  fichaCardRows,
  nextFichaCode
} from '../src/lib/domain/fichas.js';

function fixture() {
  const project = createProject({ title: 'Archivo', locale: 'es' });
  project.fichaSchema.fields = [
    createFichaField({ id: 'fld_author', label: 'Autor', key: 'autor', type: 'text' }),
    createFichaField({ id: 'fld_url', label: 'Enlace', key: 'enlace', type: 'url' })
  ];
  project.fichas.f_1 = createFichaRecord({
    id: 'f_1',
    code: 'OBJ-001',
    label: 'Retrato',
    values: { fld_author: 'Ana', fld_url: 'https://example.com' }
  });
  return project;
}

describe('ficha model', () => {
  it('validates a schema-driven record and card rows', () => {
    const project = fixture();
    expect(validateProject(project).ok).toBe(true);
    expect(fichaCardRows(project, project.fichas.f_1)).toMatchObject([
      { label: 'Autor', value: 'Ana' },
      { label: 'Enlace', value: 'https://example.com' }
    ]);
  });

  it('omits hidden fields from the card', () => {
    const project = fixture();
    project.fichaSchema.fields[0].visible = false;
    expect(fichaCardRows(project, project.fichas.f_1).map((row) => row.label)).toEqual([
      'Enlace'
    ]);
  });

  it('rejects duplicate codes and invalid URLs', () => {
    const project = fixture();
    project.fichas.f_2 = createFichaRecord({
      id: 'f_2',
      code: 'obj-001',
      label: 'Otra',
      values: { fld_url: 'javascript:alert(1)' }
    });
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.message === 'must be unique')).toBe(true);
    expect(result.errors.some((error) => error.path.includes('fld_url'))).toBe(true);
  });

  it('requires a referenced ficha on a ficha element', () => {
    const project = fixture();
    const el = createElement('ficha', {
      project,
      page: project.pages[0],
      fichaId: 'missing'
    });
    project.pages[0].elements.push(el);
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.path.includes('fichaId'))).toBe(true);
  });

  it('adds empty ficha collections when migrating older projects', () => {
    const project = fixture();
    const old = { ...project };
    delete old.fichaSchema;
    delete old.fichaSettings;
    delete old.fichas;
    const migrated = migrateProject(old);
    expect(migrated.ok).toBe(true);
    expect(migrated.project.fichaSchema.fields).toEqual([]);
    expect(migrated.project.fichaSettings.movable).toBe(false);
    expect(migrated.project.fichas).toEqual({});
  });

  it('generates the next object code', () => {
    expect(nextFichaCode({ a: { code: 'OBJ-009' }, b: { code: 'OBJ-003' } })).toBe(
      'OBJ-010'
    );
  });
});
