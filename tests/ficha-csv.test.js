import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { createFichaField } from '../src/lib/domain/fichas.js';
import { parseCsv, toCsv } from '../src/lib/domain/csv.js';
import {
  fichaCsvErrorReport,
  fichasToCsv,
  validateFichaCsv
} from '../src/lib/domain/ficha-csv.js';

function fixture() {
  const project = createProject({ title: 'Archivo', locale: 'es' });
  project.fichaSchema.fields = [
    createFichaField({
      id: 'fld_author',
      label: 'Autor',
      key: 'autor',
      type: 'text',
      required: true
    }),
    createFichaField({
      id: 'fld_url',
      label: 'Enlace',
      key: 'enlace',
      type: 'url'
    })
  ];
  project.assets.a_1 = {
    id: 'a_1',
    hash: 'h1',
    kind: 'image',
    name: 'retrato.jpg',
    mime: 'image/jpeg',
    bytes: 10
  };
  return project;
}

describe('ficha CSV', () => {
  it('parses semicolons, BOM, and quoted newlines', () => {
    const rows = parseCsv('\uFEFFcode;label\r\nOBJ-001;"Retrato\nuno"\r\n');
    expect(rows).toEqual([
      ['code', 'label'],
      ['OBJ-001', 'Retrato\nuno']
    ]);
    expect(toCsv([['a,b', 'c']])).toBe('"a,b",c');
  });

  it('parses quoted fields and validates required values', () => {
    const report = validateFichaCsv(
      fixture(),
      'code,label,image,autor,enlace\nOBJ-001,"Retrato, uno",retrato.jpg,Ana,https://example.com\nOBJ-002,Otro,,,not-a-url\n'
    );
    expect(report.total).toBe(2);
    expect(report.rows[0].assetId).toBe('a_1');
    expect(report.rows[0].label).toBe('Retrato, uno');
    expect(report.errors.some((error) => error.column === 'autor')).toBe(true);
    expect(report.errors.some((error) => error.message.includes('URL'))).toBe(true);
  });

  it('maps CSV headers through field aliases and accents', () => {
    const project = fixture();
    project.fichaSchema.fields[0].aliases = ['Autor/a', 'AUTOR'];
    const report = validateFichaCsv(
      project,
      'code,label,Autor/a\nOBJ-001,Retrato,Ana\n'
    );
    expect(report.errors).toEqual([]);
    expect(report.rows[0].values.fld_author).toBe('Ana');
  });

  it('blocks unknown headers and duplicate codes', () => {
    const project = fixture();
    project.fichas.f_1 = {
      id: 'f_1',
      code: 'OBJ-001',
      label: 'Existente',
      assetId: '',
      alt: '',
      values: { fld_author: 'Ana', fld_url: '' }
    };
    const report = validateFichaCsv(
      project,
      'code,label,autor,enlace,typographical\nOBJ-001,Retrato,Ana,,x\n'
    );
    expect(report.errors.some((error) => error.message.includes('desconocidas'))).toBe(
      true
    );
    expect(report.errors.some((error) => error.message.includes('Ya existe'))).toBe(
      true
    );
  });

  it('updates existing codes in update mode and preserves empty images', () => {
    const project = fixture();
    project.fichas.f_1 = {
      id: 'f_1',
      code: 'OBJ-001',
      label: 'Retrato',
      assetId: 'a_1',
      alt: 'Retrato',
      values: { fld_author: 'Ana', fld_url: '' }
    };
    const csv = 'code,label,image,autor\nOBJ-001,Retrato corregido,,Ana\n';
    const create = validateFichaCsv(project, csv);
    expect(create.ok).toBe(false);
    const update = validateFichaCsv(project, csv, { mode: 'update' });
    expect(update.ok).toBe(true);
    expect(update.updates).toBe(1);
    expect(update.rows[0]).toMatchObject({
      action: 'update',
      existingId: 'f_1',
      keepAsset: true
    });
  });

  it('exports a round-trippable table and an error report', () => {
    const project = fixture();
    project.fichas.f_1 = {
      id: 'f_1',
      code: 'OBJ-001',
      label: 'Retrato',
      assetId: 'a_1',
      alt: 'Retrato',
      values: { fld_author: 'Ana', fld_url: 'https://example.com' }
    };
    const csv = fichasToCsv(project);
    expect(csv).toContain('code,label,image,autor,enlace');
    expect(csv).toContain('OBJ-001,Retrato,retrato.jpg,Ana,https://example.com');
    const report = validateFichaCsv(project, 'code,label,autor\nOBJ-001,Retrato,\n');
    expect(fichaCsvErrorReport(report)).toContain('line,column,message');
  });
});
