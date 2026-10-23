import { createId } from './model.js';

export const FICHA_FIELD_TYPES = Object.freeze(['text', 'longtext', 'url']);

export const FICHA_LIMITS = Object.freeze({
  fields: 40,
  records: 2000,
  textLength: 12000
});

const FIELD_KEY = /^[a-z][a-z0-9_]*$/;

export function createFichaSchema() {
  return { fields: [] };
}

export function createFichaSettings() {
  return { movable: false, showCode: true };
}

export function defaultFichaValues(fields = []) {
  return Object.fromEntries(fields.map((field) => [field.id, '']));
}

export function createFichaField({
  id,
  label = '',
  key = '',
  type = 'text',
  required = false,
  aliases = [],
  idFactory
} = {}) {
  return {
    id: id ?? createId('fld', idFactory),
    label: String(label).trim(),
    key: String(key).trim(),
    type: FICHA_FIELD_TYPES.includes(type) ? type : 'text',
    required: Boolean(required),
    aliases: Array.isArray(aliases)
      ? aliases.map((alias) => String(alias).trim()).filter(Boolean)
      : [],
    visible: true
  };
}

export function createFichaRecord({
  id,
  code = '',
  label = '',
  assetId = '',
  alt = '',
  values = {},
  idFactory
} = {}) {
  return {
    id: id ?? createId('f', idFactory),
    code: String(code).trim(),
    label: String(label).trim(),
    assetId,
    alt: String(alt ?? '').trim(),
    values: { ...values }
  };
}

export function fichaFieldKeyFromLabel(label) {
  return (
    String(label)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^(\d)/, 'f_$1') || 'campo'
  );
}

export function fichaFieldLabel(field) {
  return field?.label?.trim() || field?.key || 'Campo';
}

export function fichaFields(project) {
  return project?.fichaSchema?.fields ?? [];
}

export function fichaRecord(project, fichaId) {
  return project?.fichas?.[fichaId] ?? null;
}

export function fichaValue(record, field) {
  return record?.values?.[field.id] ?? '';
}

export function isSafeFichaUrl(value) {
  return /^https?:\/\/[^\s]+$/i.test(String(value ?? '').trim());
}

export function fichaCardRows(project, record) {
  if (!record) return [];
  return fichaFields(project)
    .filter((field) => field.visible !== false)
    .map((field) => ({
      field,
      label: fichaFieldLabel(field),
      value: String(fichaValue(record, field) ?? '').trim()
    }))
    .filter((row) => row.value);
}

export function nextFichaCode(fichas = {}) {
  let max = 0;
  for (const record of Object.values(fichas)) {
    const match = /^OBJ-(\d+)$/i.exec(String(record.code ?? '').trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `OBJ-${String(max + 1).padStart(3, '0')}`;
}

export function fichaFieldErrors(field) {
  const errors = [];
  if (!field.label?.trim()) errors.push('label is required');
  if (!FIELD_KEY.test(field.key ?? '')) {
    errors.push('key must start with a letter and use lowercase letters, digits, or _');
  }
  if (!FICHA_FIELD_TYPES.includes(field.type)) errors.push('unknown field type');
  if (field.aliases !== undefined && !Array.isArray(field.aliases)) {
    errors.push('aliases must be an array');
  }
  return errors;
}
