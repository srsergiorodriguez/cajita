import { fichaCollectionFields, fichaCollectionRecords, normaliseFichaCollection } from '../domain/ficha-collection.js';
import { fichaCardRows } from '../domain/fichas.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fieldValues(project, field) {
  return [...new Set(
    Object.values(project.fichas ?? {})
      .map((record) => String(record.values?.[field.id] ?? '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, project.locale ?? 'es'));
}

export function fichaCollectionHtml(project, page, element, options) {
  const config = normaliseFichaCollection(element.collection);
  const fields = fichaCollectionFields(project, config);
  const records = fichaCollectionRecords(project, config);
  const es = project.locale !== 'en';
  const filtered = fields.map((field) => ({
    field,
    values: fieldValues(project, field)
  })).filter((item) => item.values.length > 1);
  const searchPlaceholder = es ? 'buscar fichas…' : 'search fichas…';
  const allLabel = es ? 'todos' : 'all';
  const countLabel = es ? 'fichas' : 'fichas';
  const emptyText = config.emptyText.trim() || (es ? 'No hay fichas que coincidan.' : 'No fichas match.');

  const cards = records.map((record) => {
    const asset = project.assets?.[record.assetId];
    const rows = fichaCardRows(project, record).slice(0, 4);
    const search = [
      record.code,
      record.label,
      ...Object.values(record.values ?? {})
    ].join(' ').toLowerCase();
    const dataFilters = filtered.map(({ field }) =>
      `data-ficha-field-${escapeHtml(field.key)}="${escapeHtml(String(record.values?.[field.id] ?? '').trim().toLowerCase())}"`
    ).join(' ');
    return `<article class="ficha-archive-card" data-ficha-card data-ficha-search="${escapeHtml(search)}" ${dataFilters}>
      ${asset ? `<img class="ficha-archive-image" src="${escapeHtml(options.assetHref(project, page, asset))}" alt="${escapeHtml(record.alt || record.label)}" loading="lazy" />` : '<div class="ficha-archive-image ficha-archive-image--empty">ficha</div>'}
      <div class="ficha-archive-copy">
        ${config.showCode ? `<span class="ficha-archive-code">${escapeHtml(record.code)}</span>` : ''}
        <strong>${escapeHtml(record.label)}</strong>
        ${rows.length ? `<dl>${rows.map((row) => `<dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd>`).join('')}</dl>` : ''}
      </div>
    </article>`;
  }).join('');

  const toolbar = config.search || filtered.length
    ? `<div class="ficha-archive-toolbar">
        ${config.search ? `<input type="search" data-ficha-search placeholder="${escapeHtml(searchPlaceholder)}" aria-label="${escapeHtml(searchPlaceholder)}" />` : ''}
        ${filtered.map(({ field, values }) => `<label class="ficha-archive-filter"><span>${escapeHtml(field.label)}</span><select data-ficha-filter="${escapeHtml(field.key)}"><option value="">${escapeHtml(allLabel)}</option>${values.map((value) => `<option value="${escapeHtml(value.toLowerCase())}">${escapeHtml(value)}</option>`).join('')}</select></label>`).join('')}
        <span class="ficha-archive-count"><b data-ficha-count>${records.length}</b> ${escapeHtml(countLabel)}</span>
      </div>`
    : '';

  return `<div class="ficha-archive" data-ficha-collection style="--ficha-columns:${config.columns}">
    ${toolbar}
    <div class="ficha-archive-grid">${cards}</div>
    <p class="ficha-archive-empty" data-ficha-empty${records.length ? ' hidden' : ''}>${escapeHtml(emptyText)}</p>
  </div>`;
}
