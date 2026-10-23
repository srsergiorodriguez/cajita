import { fichaFields, isSafeFichaUrl } from './fichas.js';
import { parseCsv, toCsv } from './csv.js';

const STRUCTURAL = ['code', 'label', 'image'];
const HEADER_ALIASES = new Map([
  ['codigo', 'code'],
  ['código', 'code'],
  ['nombre', 'label'],
  ['imagen', 'image']
]);

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function headerMap(project, headers) {
  const fields = fichaFields(project);
  const map = new Map();
  const unknown = [];
  const duplicates = [];
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;
    const alias = HEADER_ALIASES.get(normalized) ?? normalized;
    let target = null;
    if (STRUCTURAL.includes(alias)) {
      target = { kind: alias };
    } else {
      const field = fields.find((item) =>
        [item.key, item.label, ...(item.aliases ?? [])]
          .map(normalizeHeader)
          .includes(alias)
      );
      if (field) target = { kind: 'field', field };
    }
    if (!target) {
      unknown.push(header.trim());
      return;
    }
    const key = target.kind === 'field' ? `field:${target.field.id}` : target.kind;
    if (map.has(key)) {
      duplicates.push(header.trim());
      return;
    }
    map.set(key, { ...target, index, header: header.trim() });
  });
  return { map, unknown, duplicates };
}

function findAsset(project, filename) {
  const name = String(filename ?? '').trim();
  if (!name) return { asset: null, warning: null };
  const base = name.split('/').pop() ?? name;
  const matches = Object.values(project.assets ?? {}).filter(
    (asset) =>
      asset.kind === 'image' &&
      (asset.name === name ||
        asset.name.toLowerCase() === name.toLowerCase() ||
        asset.name === base ||
        asset.name.toLowerCase() === base.toLowerCase())
  );
  if (matches.length === 1) return { asset: matches[0], warning: null };
  if (matches.length > 1) {
    return {
      asset: null,
      warning: `la imagen «${name}» coincide con varios archivos; asígnala manualmente`
    };
  }
  return {
    asset: null,
    warning: `no hay una imagen llamada «${name}» en Medios; la ficha se importará sin imagen`
  };
}

export function fichaCsvTemplate(project) {
  return toCsv([['code', 'label', 'image', ...fichaFields(project).map((field) => field.key)]]);
}

export function fichasToCsv(project) {
  const fields = fichaFields(project);
  const rows = [
    ['code', 'label', 'image', ...fields.map((field) => field.key)],
    ...Object.values(project.fichas ?? {}).map((record) => [
      record.code,
      record.label,
      project.assets?.[record.assetId]?.name ?? '',
      ...fields.map((field) => record.values?.[field.id] ?? '')
    ])
  ];
  return toCsv(rows);
}

export function validateFichaCsv(project, text, { mode = 'create' } = {}) {
  const updateMode = mode === 'update';
  const table = parseCsv(text);
  if (!table.length) {
    return {
      ok: false,
      table: [],
      rows: [],
      errors: [{ line: 0, column: '', message: 'El archivo está vacío.' }],
      warnings: [],
      unknownHeaders: [],
      total: 0
    };
  }
  const headers = table[0];
  const { map, unknown, duplicates } = headerMap(project, headers);
  const errors = [];
  const warnings = [];
  if (unknown.length) {
    errors.push({
      line: 1,
      column: '',
      message: `Columnas desconocidas: ${unknown.join(', ')}. Corrige el encabezado o añade esos campos al esquema.`
    });
  }
  if (duplicates.length) {
    errors.push({
      line: 1,
      column: '',
      message: `Columnas repetidas: ${duplicates.join(', ')}.`
    });
  }
  for (const key of ['code', 'label']) {
    if (!map.has(key)) {
      errors.push({
        line: 1,
        column: key,
        message: `Falta la columna obligatoria «${key}».`
      });
    }
  }
  const existingByCode = new Map(
    Object.values(project.fichas ?? {}).map((record) => [
      record.code.trim().toLowerCase(),
      record
    ])
  );
  const seenCodes = new Set();
  const fields = fichaFields(project);
  const rows = [];
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const get = (key) => {
      const entry = map.get(key);
      return entry ? String(cells[entry.index] ?? '').trim() : '';
    };
    const code = get('code');
    const label = get('label');
    if (!code) {
      errors.push({ line, column: 'code', message: 'El código es obligatorio.' });
    }
    if (!label) {
      errors.push({ line, column: 'label', message: 'El nombre es obligatorio.' });
    }
    const normalized = code ? code.toLowerCase() : '';
    const existing = normalized ? existingByCode.get(normalized) : null;
    if (code) {
      if (seenCodes.has(normalized)) {
        errors.push({ line, column: 'code', message: `Código duplicado: ${code}.` });
      } else if (existing && !updateMode) {
        errors.push({
          line,
          column: 'code',
          message: `Ya existe una ficha con el código ${code}.`
        });
      }
      seenCodes.add(normalized);
    }
    const imageName = get('image');
    const { asset, warning } = findAsset(project, imageName);
    if (warning) warnings.push({ line, message: warning });
    const keepAsset = Boolean(updateMode && existing && !asset);
    const values = {};
    for (const field of fields) {
      const value = map.has(`field:${field.id}`) ? get(`field:${field.id}`) : '';
      if (field.required && !value) {
        errors.push({
          line,
          column: field.key,
          message: `El campo «${field.label || field.key}» es obligatorio.`
        });
      }
      if (field.type === 'url' && value && !isSafeFichaUrl(value)) {
        errors.push({
          line,
          column: field.key,
          message: `«${value}» no es una URL http(s) válida.`
        });
      }
      values[field.id] = value;
    }
    rows.push({
      line,
      code,
      label,
      action: existing && updateMode ? 'update' : 'create',
      existingId: existing && updateMode ? existing.id : '',
      assetId: asset?.id ?? '',
      keepAsset,
      alt: label,
      values
    });
  });
  const creates = rows.filter((row) => row.action === 'create').length;
  const updates = rows.filter((row) => row.action === 'update').length;
  return {
    ok: errors.length === 0 && rows.length > 0,
    table,
    rows,
    errors,
    warnings,
    unknownHeaders: unknown,
    total: table.length - 1,
    mode: updateMode ? 'update' : 'create',
    creates,
    updates
  };
}

export function fichaCsvErrorReport(report) {
  return toCsv([
    ['line', 'column', 'message'],
    ...report.errors.map((error) => [error.line, error.column, error.message]),
    ...report.warnings.map((warning) => [warning.line, 'aviso', warning.message])
  ]);
}
