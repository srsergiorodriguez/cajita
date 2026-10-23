import { platform } from '../platform/index.js';
import { createId, createProject, projectStats } from '../domain/model.js';
import { parseProject, touchProject, validateProject } from '../domain/project.js';
import { checkAssetLimit, findAssetByHash } from '../domain/assets.js';
import {
  appendPage,
  deletePage as deletePageInDraft,
  duplicatePage as duplicatePageInDraft,
  pageById,
  pageElementById,
  renamePageSlug as renamePageSlugInDraft,
  renamePageTitle as renamePageTitleInDraft,
  setStartPage as setStartPageInDraft,
  moveElementLayer as moveElementLayerInDraft,
  setElementOrder as setElementOrderInDraft,
  normaliseZ
} from '../domain/pages.js';
import { createElement, duplicateElement, mediaFrame } from '../domain/elements.js';
import { resizeStage } from '../domain/stage.js';
import { normalizeCustomDomain } from '../domain/publish/domain.js';
import { appendPublishHistory } from '../domain/publish/history.js';
import { githubPagesUrl } from '../domain/publish/plan.js';
import { canAddFont, fontNameExists, fontUsage } from '../domain/fonts.js';
import { frameContainsPoint } from '../domain/geometry.js';
import {
  createFichaRecord,
  defaultFichaValues,
  fichaFieldErrors,
  nextFichaCode
} from '../domain/fichas.js';
import { refreshLibrary } from './library.svelte.js';
import { clearAssetUrl, clearAssetUrls } from './asset-urls.svelte.js';

export const session = $state({
  project: null,
  activePageId: null,
  selectedAssetId: null,
  selectedElementIds: [],
  past: [],
  future: [],
  lastCommand: null,
  savedAt: null,
  revision: 0,
  status: 'saved',
  busy: null,
  lockConflict: false,
  recovered: false,
  error: null
});

let lock = null;
let saveTimer = null;
let savePromise = null;
let saveQueued = false;
const HISTORY_LIMIT = 40;
let lastCoalesce = null;
let elementClipboard = [];
let assetClipboard = null;

export function takeProjectLock() {
  lock?.takeover();
  session.lockConflict = false;
}

export function activePage() {
  if (!session.project) return null;
  return (
    session.project.pages.find((page) => page.id === session.activePageId) ??
    session.project.pages[0] ??
    null
  );
}

function clearSaveTimer() {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
}

function releaseLock() {
  lock?.release();
  lock = null;
  session.lockConflict = false;
}

async function loadValidProject(id) {
  const row = await platform.projects.load(id);
  if (!row) return null;

  const parsed = parseProject(row.project);
  if (parsed.ok) {
    return { project: parsed.project, savedAt: row.savedAt, revision: row.revision ?? 0 };
  }

  const backups = await platform.projects.listBackups(id);
  for (const backup of backups) {
    const recovered = parseProject(backup.project);
    if (recovered.ok) {
      return {
        project: recovered.project,
        savedAt: backup.savedAt,
        revision: backup.revision ?? 0,
        recovered: true
      };
    }
  }

  throw new Error(
    `El proyecto no se pudo abrir: ${parsed.errors[0]?.path || 'formato'} — ${parsed.errors[0]?.message || 'inválido'}`
  );
}

function snapshotProject() {
  return structuredClone($state.snapshot(session.project));
}

function ensureActivePage(project) {
  if (!project) return;
  if (!project.pages.some((page) => page.id === session.activePageId)) {
    session.activePageId =
      project.pages.find((page) => page.id === project.startPageId)?.id ??
      project.pages[0]?.id ??
      null;
  }
}

function pruneSelection(project) {
  if (!project) {
    session.selectedElementIds = [];
    return;
  }
  const live = new Set();
  for (const page of project.pages) {
    for (const element of page.elements ?? []) live.add(element.id);
  }
  session.selectedElementIds = session.selectedElementIds.filter((id) => live.has(id));
}

export function canUndo() {
  return session.past.length > 0;
}

export function canRedo() {
  return session.future.length > 0;
}

/**
 * Every document mutation goes through here. We mutate a clone, validate it,
 * then commit. History stores snapshots, so undo never has to know command
 * internals. `coalesceKey` merges pointer moves inside a 600 ms window.
 */
export function runCommand(
  label,
  mutate,
  { coalesceKey = null, activePageId = null } = {}
) {
  if (!session.project) throw new Error('No hay un proyecto abierto.');
  if (session.lockConflict) throw new Error('El proyecto está abierto en otra pestaña.');

  const before = snapshotProject();
  const draft = structuredClone(before);
  const result = mutate(draft);

  const check = validateProject(draft);
  if (!check.ok) {
    const first = check.errors[0];
    throw new Error(`${first?.path || 'proyecto'}: ${first?.message || 'inválido'}`);
  }

  if (JSON.stringify(before) === JSON.stringify(draft)) return result;

  session.project = draft;
  if (activePageId) session.activePageId = activePageId;
  ensureActivePage(draft);
  pruneSelection(draft);

  const now = Date.now();
  const merge =
    coalesceKey && lastCoalesce?.key === coalesceKey && now - lastCoalesce.at < 600;

  if (!merge) {
    session.past.push(before);
    if (session.past.length > HISTORY_LIMIT) session.past.shift();
    session.future = [];
  }

  lastCoalesce = coalesceKey ? { key: coalesceKey, at: now } : null;
  session.lastCommand = { label, at: now };
  scheduleSave();
  return result;
}

function restoreSnapshot(project) {
  session.project = $state.snapshot(project);
  ensureActivePage(session.project);
  pruneSelection(session.project);
  lastCoalesce = null;
  scheduleSave();
}

export function undo() {
  if (!session.project || session.lockConflict || session.past.length === 0) return;
  session.future.push(snapshotProject());
  const previous = session.past.pop();
  restoreSnapshot(previous);
}

export function redo() {
  if (!session.project || session.lockConflict || session.future.length === 0) return;
  session.past.push(snapshotProject());
  const next = session.future.pop();
  restoreSnapshot(next);
}

export function selectElement(elementId, { additive = false } = {}) {
  if (!elementId) {
    session.selectedElementIds = [];
    return;
  }
  if (additive) {
    session.selectedElementIds = session.selectedElementIds.includes(elementId)
      ? session.selectedElementIds.filter((id) => id !== elementId)
      : [...session.selectedElementIds, elementId];
  } else {
    session.selectedElementIds = [elementId];
  }
  session.selectedAssetId = null;
}

export function clearElementSelection() {
  session.selectedElementIds = [];
}

export function selectedElements() {
  const page = activePage();
  if (!page) return [];
  const ids = new Set(session.selectedElementIds);
  return (page.elements ?? []).filter((element) => ids.has(element.id));
}

export function selectedElement() {
  return selectedElements()[0] ?? null;
}

export function addPage(title) {
  let page;
  runCommand('añadir página', (draft) => {
    page = appendPage(draft, { title });
  });
  if (page) {
    session.activePageId = page.id;
    session.selectedElementIds = [];
    scheduleSave();
  }
  return page;
}

export function removePage(pageId) {
  let next;
  runCommand('eliminar página', (draft) => {
    next = deletePageInDraft(draft, pageId);
  });
  if (next) session.activePageId = next.id;
  session.selectedElementIds = [];
  return next;
}

export function duplicatePage(pageId) {
  let copy;
  runCommand('duplicar página', (draft) => {
    copy = duplicatePageInDraft(draft, pageId);
  });
  if (copy) session.activePageId = copy.id;
  session.selectedElementIds = [];
  return copy;
}

export function renamePageTitle(pageId, title, { coalesceKey } = {}) {
  return runCommand(
    'renombrar página',
    (draft) => renamePageTitleInDraft(draft, pageId, title),
    { coalesceKey: coalesceKey ?? null }
  );
}

export function renamePageSlug(pageId, slug, { coalesceKey } = {}) {
  return runCommand(
    'cambiar dirección',
    (draft) => renamePageSlugInDraft(draft, pageId, slug),
    { coalesceKey: coalesceKey ?? null }
  );
}

export function makeStartPage(pageId) {
  return runCommand('marcar inicio', (draft) => setStartPageInDraft(draft, pageId));
}

export function updatePage(pageId, patch, { coalesceKey = null } = {}) {
  return runCommand(
    'actualizar página',
    (draft) => {
      const page = pageById(draft, pageId);
      if (!page) throw new Error('La página no existe.');
      if (patch.background) page.background = { ...page.background, ...patch.background };
      const rest = { ...patch };
      delete rest.background;
      Object.assign(page, rest);
      return page;
    },
    { coalesceKey }
  );
}

export function addElement(type, options = {}) {
  let element;
  runCommand(`añadir ${type}`, (draft) => {
    const page = pageById(draft, session.activePageId) ?? draft.pages[0];
    const asset = options.assetId ? draft.assets[options.assetId] : options.asset;
    const frame =
      options.frame ??
      (asset ? mediaFrame(asset, draft.stage, page.elements.length) : undefined);
    element = createElement(type, {
      project: draft,
      page,
      stage: draft.stage,
      asset,
      frame,
      text: options.text ?? '',
      provider: options.provider ?? '',
      url: options.url ?? '',
      title: options.title ?? '',
      caption: options.caption ?? '',
      fichaId: options.fichaId ?? '',
      name: options.name ?? '',
      shape: options.shape ?? 'circle',
      fill: options.fill ?? '',
      stroke: options.stroke ?? '',
      strokeWidth: options.strokeWidth ?? 0,
      index: page.elements.length
    });
    page.elements.push(element);
    normaliseZ(page);
  });
  if (element) {
    session.activePageId =
      pageById(session.project, session.activePageId)?.id ?? session.activePageId;
    session.selectedElementIds = [element.id];
    session.selectedAssetId = null;
  }
  return element;
}

export function addFichaRecord({
  code,
  label,
  assetId = '',
  alt = '',
  values = {}
} = {}) {
  let record;
  runCommand('crear ficha', (draft) => {
    record = createFichaRecord({
      code: code || nextFichaCode(draft.fichas),
      label: label || 'Ficha sin título',
      assetId,
      alt,
      values: { ...defaultFichaValues(draft.fichaSchema?.fields), ...values }
    });
    draft.fichas[record.id] = record;
  });
  return record;
}

export function updateFichaRecord(fichaId, patch, { coalesceKey = null } = {}) {
  return runCommand(
    'actualizar ficha',
    (draft) => {
      const record = draft.fichas?.[fichaId];
      if (!record) throw new Error('La ficha no existe.');
      const next = { ...record, ...patch };
      if (patch.values) next.values = { ...record.values, ...patch.values };
      draft.fichas[fichaId] = next;
      return next;
    },
    { coalesceKey }
  );
}

export function importFichaRecords(rows) {
  const createdIds = [];
  const updatedIds = [];
  runCommand('importar fichas', (draft) => {
    for (const row of rows) {
      if (row.action === 'update' && row.existingId) {
        const existing = draft.fichas?.[row.existingId];
        if (!existing) throw new Error('La ficha a actualizar ya no existe.');
        existing.code = row.code;
        existing.label = row.label;
        existing.alt = row.alt || row.label;
        existing.values = { ...existing.values, ...row.values };
        if (row.assetId) existing.assetId = row.assetId;
        else if (!row.keepAsset) existing.assetId = '';
        updatedIds.push(existing.id);
        continue;
      }
      const record = createFichaRecord({
        code: row.code,
        label: row.label,
        assetId: row.assetId || '',
        alt: row.alt || row.label,
        values: { ...defaultFichaValues(draft.fichaSchema?.fields), ...row.values }
      });
      draft.fichas[record.id] = record;
      createdIds.push(record.id);
    }
  });
  return { count: createdIds.length + updatedIds.length, createdIds, updatedIds };
}

export function placeFichasGrid(fichaIds) {
  let placed = 0;
  runCommand('colocar fichas', (draft) => {
    const page = pageById(draft, session.activePageId) ?? draft.pages[0];
    const records = fichaIds
      .map((id) => ({ id, record: draft.fichas?.[id] }))
      .filter((item) => item.record);
    if (!records.length) return;
    const n = records.length;
    const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(n))));
    const rows = Math.ceil(n / cols);
    const margin = Math.max(24, Math.round(Math.min(draft.stage.width, draft.stage.height) * 0.06));
    const gap = 24;
    const cellW = (draft.stage.width - margin * 2 - gap * (cols - 1)) / cols;
    const cellH = (draft.stage.height - margin * 2 - gap * (rows - 1)) / rows;
    records.forEach(({ id, record }, index) => {
      const asset = draft.assets?.[record.assetId];
      const ratio = asset?.width && asset?.height ? asset.width / asset.height : 0.8;
      let w = cellW * 0.9;
      let h = w / ratio;
      if (h > cellH * 0.9) {
        h = cellH * 0.9;
        w = h * ratio;
      }
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = margin + col * (cellW + gap) + (cellW - w) / 2;
      const y = margin + row * (cellH + gap) + (cellH - h) / 2;
      const element = createElement('ficha', {
        project: draft,
        page,
        stage: draft.stage,
        asset,
        fichaId: id,
        name: record.label,
        frame: { x, y, w, h, rotation: 0 }
      });
      element.name = record.label;
      page.elements.push(element);
      placed += 1;
    });
    normaliseZ(page);
  });
  return placed;
}

export function deleteFichaRecord(fichaId) {
  let removedElements = 0;
  runCommand('eliminar ficha', (draft) => {
    if (!draft.fichas?.[fichaId]) throw new Error('La ficha no existe.');
    for (const page of draft.pages) {
      const before = page.elements.length;
      page.elements = page.elements.filter((element) => element.fichaId !== fichaId);
      removedElements += before - page.elements.length;
      normaliseZ(page);
    }
    delete draft.fichas[fichaId];
  });
  return removedElements;
}

export function saveFichaSchema(fields, { showCode } = {}) {
  return runCommand('actualizar esquema de fichas', (draft) => {
    const clean = fields.map((field) => ({
      id: field.id,
      label: field.label.trim(),
      key: field.key.trim(),
      type: field.type,
      required: Boolean(field.required),
      visible: field.visible !== false
    }));
    for (const field of clean) {
      const error = fichaFieldErrors(field)[0];
      if (error) throw new Error(`${field.label || field.key}: ${error}`);
    }
    const ids = new Set();
    const keys = new Set();
    for (const field of clean) {
      if (ids.has(field.id))
        throw new Error('Hay dos campos con el mismo identificador.');
      if (keys.has(field.key)) throw new Error(`El campo «${field.key}» está repetido.`);
      ids.add(field.id);
      keys.add(field.key);
    }
    draft.fichaSchema.fields = clean;
    if (typeof showCode === 'boolean') draft.fichaSettings.showCode = showCode;
    for (const record of Object.values(draft.fichas ?? {})) {
      const next = {};
      for (const field of clean) next[field.id] = record.values?.[field.id] ?? '';
      record.values = next;
    }
  });
}

export function setFichasMovable(movable) {
  return runCommand('ajustar fichas móviles', (draft) => {
    draft.fichaSettings.movable = Boolean(movable);
  });
}

export function addFichaElement(fichaId) {
  const record = session.project?.fichas?.[fichaId];
  if (!record) throw new Error('La ficha no existe.');
  return addElement('ficha', {
    fichaId,
    assetId: record.assetId || undefined,
    name: record.label
  });
}

export function updateElement(elementId, patch, options = {}) {
  return runCommand(
    options.label ?? 'actualizar elemento',
    (draft) => {
      let target = null;
      for (const page of draft.pages) {
        target = pageElementById(page, elementId);
        if (target) break;
      }
      if (!target) throw new Error('El elemento no existe.');
      if (patch.frame) {
        target.frame = { ...target.frame, ...patch.frame };
        const rest = { ...patch };
        delete rest.frame;
        Object.assign(target, rest);
      } else {
        Object.assign(target, patch);
      }
      return target;
    },
    { coalesceKey: options.coalesceKey ?? null }
  );
}

export function moveElements(ids, dx, dy, options = {}) {
  return runCommand(
    'mover elementos',
    (draft) => {
      const set = new Set(ids);
      for (const page of draft.pages) {
        for (const element of page.elements ?? []) {
          if (!set.has(element.id)) continue;
          element.frame = {
            ...element.frame,
            x: element.frame.x + dx,
            y: element.frame.y + dy
          };
        }
      }
    },
    { coalesceKey: options.coalesceKey ?? `move:${ids.join(',')}` }
  );
}

export function deleteElements(ids) {
  return runCommand('eliminar elementos', (draft) => {
    const set = new Set(ids);
    for (const page of draft.pages) {
      page.elements = (page.elements ?? []).filter((element) => !set.has(element.id));
      normaliseZ(page);
    }
  });
}

export function deleteSelectedElements() {
  if (!session.selectedElementIds.length) return;
  const ids = [...session.selectedElementIds];
  deleteElements(ids);
  session.selectedElementIds = [];
}

export function copySelection() {
  const elements = selectedElements();
  if (elements.length) {
    elementClipboard = structuredClone($state.snapshot(elements));
    assetClipboard = null;
    return { kind: 'elements', count: elements.length };
  }
  const asset = session.selectedAssetId
    ? session.project?.assets?.[session.selectedAssetId]
    : null;
  if (asset) {
    assetClipboard = asset.id;
    elementClipboard = [];
    return { kind: 'asset', count: 1, name: asset.name };
  }
  return null;
}

export function cutSelection() {
  const result = copySelection();
  if (!result) return null;
  if (result.kind === 'elements') {
    deleteElements(session.selectedElementIds);
    session.selectedElementIds = [];
    return result;
  }
  // Media files are immutable library entries; cutting keeps them available for
  // the paste and does not remove the source asset.
  return result;
}

export function pasteSelection() {
  if (elementClipboard.length) {
    const pasted = [];
    runCommand('pegar elementos', (draft) => {
      const page = pageById(draft, session.activePageId) ?? draft.pages[0];
      for (const item of elementClipboard) {
        const copy = duplicateElement(item);
        if (
          copy.type === 'text' &&
          copy.heading &&
          page.elements.some((element) => element.type === 'text' && element.heading)
        ) {
          copy.heading = false;
        }
        page.elements.push(copy);
        pasted.push(copy.id);
      }
      normaliseZ(page);
    });
    session.selectedElementIds = pasted;
    return { kind: 'elements', count: pasted.length };
  }
  if (assetClipboard) {
    const asset = session.project?.assets?.[assetClipboard];
    if (!asset || !['image', 'video', 'audio'].includes(asset.kind)) return null;
    addElement(asset.kind, { assetId: asset.id });
    return { kind: 'asset', count: 1, name: asset.name };
  }
  return null;
}

export function duplicateElementById(elementId) {
  let copy;
  runCommand('duplicar elemento', (draft) => {
    const page = draft.pages.find((item) => pageElementById(item, elementId));
    if (!page) throw new Error('El elemento no existe.');
    const element = pageElementById(page, elementId);
    copy = duplicateElement(element);
    page.elements.push(copy);
    normaliseZ(page);
  });
  if (copy) session.selectedElementIds = [copy.id];
  return copy;
}

export function reorderLayers(orderedIds) {
  return runCommand('reordenar capas', (draft) => {
    const page = pageById(draft, session.activePageId) ?? draft.pages[0];
    if (!page) throw new Error('La página no existe.');
    setElementOrderInDraft(page, orderedIds);
  });
}

export function configurePublish({
  owner,
  repo,
  branch = 'gh-pages',
  customDomain = '',
  lastPublishedAt = ''
} = {}) {
  const domain = normalizeCustomDomain(customDomain);
  if (customDomain && !domain) {
    throw new Error('El dominio personalizado no es válido.');
  }
  return runCommand('configurar publicación', (draft) => {
    const previous = draft.publish ?? {};
    draft.publish = {
      ...previous,
      provider: 'github-pages',
      owner,
      repo,
      branch,
      ...(lastPublishedAt ? { lastPublishedAt } : {})
    };
    if (domain) draft.publish.customDomain = domain;
    else delete draft.publish.customDomain;
    draft.meta = draft.meta ?? {};
    draft.meta.canonicalUrl = domain ? `https://${domain}/` : githubPagesUrl(owner, repo);
  });
}

export function recordPublish(entry) {
  return runCommand('registrar publicación', (draft) => {
    draft.publish = draft.publish ?? {};
    draft.publish.history = appendPublishHistory(draft.publish.history, entry);
    if (entry?.kind === 'publish') {
      draft.publish.lastPublishedAt = entry.at;
    }
  });
}

export function updateStageSize(width, height, { coalesceKey = null } = {}) {
  return runCommand(
    'cambiar tamaño de página',
    (draft) => {
      resizeStage(draft, width, height);
    },
    { coalesceKey }
  );
}

export function fitTextHeight(elementId, height) {
  if (!session.project) return;
  const page = activePage();
  const element = page?.elements?.find((item) => item.id === elementId);
  if (!element || element.type !== 'text') return;
  const next = Math.round(height * 100) / 100;
  if (!Number.isFinite(next) || next < 1 || Math.abs(element.frame.h - next) < 0.5)
    return;
  element.frame.h = next;
  touchProject(session.project);
  scheduleSave();
}

export function moveLayer(elementId, delta) {
  return runCommand('cambiar capa', (draft) => {
    const page = draft.pages.find((item) => pageElementById(item, elementId));
    if (!page) throw new Error('El elemento no existe.');
    moveElementLayerInDraft(page, elementId, delta);
  });
}

export function elementAt(point) {
  const page = activePage();
  if (!page) return null;
  const elements = [...page.elements]
    .filter((element) => !element.hidden && !element.locked)
    .sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
  return elements.find((element) => frameContainsPoint(element.frame, point)) ?? null;
}

export async function addCustomFont({
  file,
  name,
  weight = 400,
  style = 'normal',
  licenseNote = ''
}) {
  if (!session.project) throw new Error('No hay un proyecto abierto.');
  if (session.lockConflict) throw new Error('El proyecto está abierto en otra pestaña.');
  const limit = canAddFont(session.project);
  if (!limit.ok) throw new Error(limit.message);
  const cleanName = String(name ?? '').trim();
  if (!cleanName) throw new Error('La tipografía necesita un nombre.');
  if (fontNameExists(session.project, cleanName)) {
    throw new Error('Ya existe una tipografía con ese nombre.');
  }

  const processed = await platform.media.processFont(file);
  const assetId = createId('a');
  const fontId = createId('f');
  const createdAt = new Date().toISOString();
  const assetMeta = {
    id: assetId,
    ...processed.meta,
    createdAt
  };
  await platform.assets.put(session.project.id, assetMeta, processed.blob, null);

  const font = {
    id: fontId,
    name: cleanName,
    assetId,
    format: processed.meta.format,
    weight: Math.min(900, Math.max(100, Number(weight) || 400)),
    style: style === 'italic' ? 'italic' : 'normal',
    licenseNote: String(licenseNote ?? '').trim(),
    createdAt
  };

  try {
    runCommand('añadir tipografía', (draft) => {
      draft.assets[assetId] = assetMeta;
      draft.fonts[fontId] = font;
    });
  } catch (error) {
    await platform.assets.remove(session.project.id, assetId);
    throw error;
  }
  return font;
}

export async function removeCustomFont(fontId) {
  if (!session.project) return;
  const font = session.project.fonts?.[fontId];
  if (!font) return;
  if (fontUsage(session.project, fontId) > 0) {
    throw new Error('La tipografía está en uso en una página.');
  }
  runCommand('eliminar tipografía', (draft) => {
    delete draft.fonts[fontId];
    delete draft.assets[font.assetId];
  });
  await platform.assets.remove(session.project.id, font.assetId);
}

export async function openProject(id) {
  clearSaveTimer();
  if (session.project) {
    await saveNow();
    clearAssetUrls(session.project.id);
  }
  releaseLock();
  session.error = null;
  session.recovered = false;

  const loaded = await loadValidProject(id);
  if (!loaded) throw new Error('El proyecto no existe.');
  session.project = loaded.project;
  session.activePageId = loaded.project.startPageId;
  session.selectedAssetId = null;
  session.selectedElementIds = [];
  session.past = [];
  session.future = [];
  session.lastCommand = null;
  lastCoalesce = null;
  session.savedAt = loaded.savedAt ?? null;
  session.revision = loaded.revision ?? 0;
  session.status = 'saved';
  session.recovered = Boolean(loaded.recovered);
  session.lockConflict = false;

  lock = platform.locks.create(id, (conflicted) => {
    session.lockConflict = conflicted;
    if (conflicted) session.status = 'locked';
    else if (session.status === 'locked') session.status = 'saved';
  });
  session.lockConflict = lock.conflicted;
  if (session.lockConflict) session.status = 'locked';

  return session.project;
}

export async function createAndOpenProject({
  title,
  locale = 'es',
  stagePreset = 'wide',
  stageWidth,
  stageHeight,
  theme = 'papel'
} = {}) {
  const project = createProject({ title, locale, stagePreset, stageWidth, stageHeight, theme });
  await platform.projects.save(project, { revision: 1, backup: true });
  await refreshLibrary();
  await openProject(project.id);
  return project;
}

export function selectAsset(assetId) {
  session.selectedAssetId = assetId;
}

export function setActivePage(pageId) {
  if (!session.project) return;
  if (session.project.pages.some((page) => page.id === pageId)) {
    session.activePageId = pageId;
    session.selectedAssetId = null;
    session.selectedElementIds = [];
  }
}

export function scheduleSave() {
  if (!session.project || session.lockConflict) return;
  session.status = 'saving';
  clearSaveTimer();
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    void saveNow();
  }, 600);
}

export function saveNow({ backup = true } = {}) {
  if (!session.project || session.lockConflict) return Promise.resolve();
  if (savePromise) {
    saveQueued = true;
    return savePromise;
  }

  clearSaveTimer();
  session.status = 'saving';
  savePromise = (async () => {
    try {
      do {
        saveQueued = false;
        session.revision += 1;
        touchProject(session.project);
        const snapshot = $state.snapshot(session.project);
        const saved = await platform.projects.save(snapshot, {
          revision: session.revision,
          backup
        });
        session.savedAt = saved.savedAt;
        session.status = 'saved';
      } while (saveQueued);
    } catch (error) {
      session.status = 'error';
      session.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      savePromise = null;
      if (saveQueued) {
        saveQueued = false;
        void saveNow({ backup });
      }
    }
  })();

  return savePromise;
}

export async function flushSave() {
  if (!session.project || session.lockConflict) return;
  await saveNow();
}

export async function closeProject() {
  clearSaveTimer();
  if (session.project) {
    try {
      await saveNow();
    } catch {
      // Keep the project open so the user can download it before closing.
      return false;
    }
  }
  if (session.project) clearAssetUrls(session.project.id);
  releaseLock();
  session.project = null;
  session.activePageId = null;
  session.selectedAssetId = null;
  session.selectedElementIds = [];
  session.past = [];
  session.future = [];
  session.lastCommand = null;
  lastCoalesce = null;
  session.savedAt = null;
  session.revision = 0;
  session.status = 'saved';
  session.error = null;
  session.recovered = false;
  await refreshLibrary();
  return true;
}

export async function importMedia(files) {
  if (!session.project) throw new Error('No hay un proyecto abierto.');
  if (session.lockConflict) throw new Error('El proyecto está abierto en otra pestaña.');

  const results = {
    added: 0,
    skipped: 0,
    errors: [],
    addedAssets: [],
    skippedAssets: []
  };
  session.busy = 'media';

  try {
    for (const file of files) {
      try {
        const processed = await platform.media.process(file, session.project.media);
        const existing = findAssetByHash(session.project, processed.meta.hash);
        if (existing) {
          results.skipped += 1;
          results.skippedAssets.push(existing);
          continue;
        }

        const limit = checkAssetLimit(
          session.project,
          processed.meta.kind,
          processed.meta.bytes
        );
        if (!limit.ok) {
          results.errors.push(`${file.name}: ${limit.message}`);
          continue;
        }

        const meta = {
          id: createId('a'),
          ...processed.meta,
          createdAt: new Date().toISOString()
        };
        await platform.assets.put(
          session.project.id,
          meta,
          processed.blob,
          processed.thumb,
          processed.thumbHash
        );
        session.project.assets[meta.id] = meta;
        results.added += 1;
        results.addedAssets.push(meta);
        scheduleSave();
      } catch (error) {
        results.errors.push(
          `${file.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return results;
  } finally {
    session.busy = null;
  }
}

export async function deleteAsset(assetId) {
  if (!session.project) return;
  for (const page of session.project.pages) {
    for (const element of page.elements ?? []) {
      if (element.assetId === assetId) {
        throw new Error('El medio está en uso en una página.');
      }
    }
  }
  if (
    Object.values(session.project.fichas ?? {}).some((ficha) => ficha.assetId === assetId)
  ) {
    throw new Error('El medio está en uso en una ficha.');
  }
  if (
    Object.values(session.project.fonts ?? {}).some((font) => font.assetId === assetId)
  ) {
    throw new Error('La tipografía está en uso en una página.');
  }
  await platform.assets.remove(session.project.id, assetId);
  clearAssetUrl(session.project.id, assetId);
  delete session.project.assets[assetId];
  if (session.selectedAssetId === assetId) session.selectedAssetId = null;
  scheduleSave();
}

export function stats() {
  return session.project ? projectStats(session.project) : null;
}

export async function downloadBundle() {
  if (!session.project) return;
  session.busy = 'download';
  try {
    await saveNow();
    const bytes = await platform.bundle.build(session.project);
    platform.files.downloadBytes(
      bytes,
      platform.bundle.fileName(session.project),
      'application/zip'
    );
  } finally {
    session.busy = null;
  }
}

export async function exportSite() {
  if (!session.project) return;
  session.busy = 'export-site';
  try {
    await saveNow();
    const result = await platform.site.build($state.snapshot(session.project));
    platform.files.downloadBytes(result.bytes, result.name, 'application/zip');
    return result;
  } finally {
    session.busy = null;
  }
}

export async function importBundleFile(file) {
  session.busy = 'import';
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const project = await platform.bundle.import(bytes);
    await refreshLibrary();
    await openProject(project.id);
    return project;
  } finally {
    session.busy = null;
  }
}

export async function deleteProjectById(id) {
  clearAssetUrls(id);
  if (session.project?.id === id) {
    releaseLock();
    session.project = null;
    session.activePageId = null;
    session.selectedAssetId = null;
    session.selectedElementIds = [];
    session.past = [];
    session.future = [];
  }
  await platform.projects.remove(id);
  await refreshLibrary();
}
