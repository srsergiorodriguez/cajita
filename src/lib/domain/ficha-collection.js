export const DEFAULT_FICHA_COLLECTION = Object.freeze({
  search: true,
  columns: 3,
  showCode: true,
  sort: 'code',
  filterFieldIds: [],
  emptyText: ''
});

export function normaliseFichaCollection(raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return {
    search: raw.search !== false,
    columns: Math.max(1, Math.min(6, Math.round(Number(raw.columns) || 3))),
    showCode: raw.showCode !== false,
    sort: raw.sort === 'label' ? 'label' : 'code',
    filterFieldIds: Array.isArray(raw.filterFieldIds)
      ? [...new Set(raw.filterFieldIds.filter((id) => typeof id === 'string'))].slice(0, 8)
      : [],
    emptyText: typeof raw.emptyText === 'string' ? raw.emptyText : ''
  };
}

export function fichaCollectionFields(project, config = {}) {
  const selected = new Set(normaliseFichaCollection(config).filterFieldIds);
  return (project?.fichaSchema?.fields ?? []).filter((field) => selected.has(field.id));
}

export function fichaCollectionRecords(project, config = {}) {
  const clean = normaliseFichaCollection(config);
  const records = Object.values(project?.fichas ?? {});
  return records.sort((a, b) => {
    const left = clean.sort === 'label' ? a.label : a.code;
    const right = clean.sort === 'label' ? b.label : b.code;
    return String(left).localeCompare(String(right), project?.locale ?? 'es');
  });
}

export function fichaCollectionSearchText(project, record) {
  const fields = project?.fichaSchema?.fields ?? [];
  const values = fields.map((field) => String(record?.values?.[field.id] ?? '').trim());
  return [record?.code, record?.label, ...values]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
