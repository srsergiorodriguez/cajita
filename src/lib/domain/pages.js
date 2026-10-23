import { createId, createPage, nowIso } from './model.js';
import { isValidSlug, makeSlug } from './slugs.js';
import { pruneRedirects, redirectsForRename } from './redirects.js';

export function pageById(project, pageId) {
  return project?.pages?.find((page) => page.id === pageId) ?? null;
}

export function pageSlugs(project) {
  return (project?.pages ?? []).map((page) => page.slug);
}

/** Append a page with a unique slug. Mutates the draft project. */
export function appendPage(project, { title = 'Página', slug, clock = nowIso } = {}) {
  const cleanTitle = String(title ?? '').trim() || 'Página';
  const page = createPage({
    title: cleanTitle,
    slug: slug ?? makeSlug(cleanTitle, pageSlugs(project))
  });
  project.pages.push(page);
  project.updatedAt = clock();
  return page;
}

/** Rename a page title. The slug is deliberately separate: titles are free text. */
export function renamePageTitle(project, pageId, title, { clock = nowIso } = {}) {
  const page = pageById(project, pageId);
  if (!page) throw new Error('La página no existe.');
  const next = String(title ?? '').trim();
  if (!next) throw new Error('El título no puede estar vacío.');
  page.title = next;
  project.updatedAt = clock();
  return page;
}

/**
 * Rename a page slug and push the old slug into the bounded redirect queue.
 * Internal links stay on page IDs, so they are never rewritten.
 */
export function renamePageSlug(project, pageId, slug, { clock = nowIso } = {}) {
  const page = pageById(project, pageId);
  if (!page) throw new Error('La página no existe.');
  const next = String(slug ?? '').trim();
  if (!isValidSlug(next)) throw new Error('La dirección no es válida.');
  if (project.pages.some((item) => item.id !== pageId && item.slug === next)) {
    throw new Error('Esa dirección ya está en uso.');
  }
  if (page.slug === next) return page;

  const nextPages = project.pages.map((item) =>
    item.id === pageId ? { ...item, slug: next } : item
  );
  project.redirects = redirectsForRename(
    project.redirects ?? [],
    project.pages,
    pageId,
    next,
    clock
  );
  page.slug = next;
  project.updatedAt = clock();
  return page;
}

export function setStartPage(project, pageId, { clock = nowIso } = {}) {
  if (!pageById(project, pageId)) throw new Error('La página no existe.');
  project.startPageId = pageId;
  project.updatedAt = clock();
}

/**
 * Delete a page, clear page links that pointed to it, and choose a new start
 * page when needed. A project must keep at least one page.
 */
export function deletePage(project, pageId, { clock = nowIso } = {}) {
  if (project.pages.length <= 1) throw new Error('El proyecto necesita una página.');
  const index = project.pages.findIndex((page) => page.id === pageId);
  if (index < 0) throw new Error('La página no existe.');

  project.pages.splice(index, 1);
  const next = project.pages[Math.min(index, project.pages.length - 1)];

  for (const page of project.pages) {
    for (const element of page.elements ?? []) {
      if (element.link?.kind === 'page' && element.link.pageId === pageId) {
        element.link = null;
      }
    }
  }

  if (project.startPageId === pageId) project.startPageId = next.id;
  project.redirects = pruneRedirects(project.redirects ?? [], project.pages);
  project.updatedAt = clock();
  return next;
}

/** Duplicate a page, its elements, and its internal element links. */
export function duplicatePage(project, pageId, { title, clock = nowIso } = {}) {
  const source = pageById(project, pageId);
  if (!source) throw new Error('La página no existe.');
  const nextTitle =
    String(title ?? `${source.title} copia`).trim() || `${source.title} copia`;
  const copy = {
    ...structuredClone(source),
    id: createId('p'),
    title: nextTitle,
    slug: makeSlug(nextTitle, pageSlugs(project)),
    elements: (source.elements ?? []).map((element) => ({
      ...structuredClone(element),
      id: createId('el')
    })),
    map: undefined
  };
  project.pages.push(copy);
  project.updatedAt = clock();
  return copy;
}

export function normaliseZ(page) {
  (page.elements ?? [])
    .slice()
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    .forEach((element, index) => {
      element.z = index;
    });
}

export function moveElementLayer(page, elementId, delta) {
  const elements = [...(page.elements ?? [])].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const index = elements.findIndex((element) => element.id === elementId);
  if (index < 0) return page;
  const target = Math.min(elements.length - 1, Math.max(0, index + delta));
  if (target === index) return page;
  const [moved] = elements.splice(index, 1);
  elements.splice(target, 0, moved);
  elements.forEach((element, nextIndex) => {
    element.z = nextIndex;
  });
  page.elements = elements;
  return page;
}

export function setElementOrder(page, orderedIds) {
  const byId = new Map((page.elements ?? []).map((element) => [element.id, element]));
  const ordered = [];
  for (const id of orderedIds) {
    const element = byId.get(id);
    if (element && !ordered.includes(element)) ordered.push(element);
  }
  for (const element of page.elements ?? []) {
    if (!ordered.includes(element)) ordered.push(element);
  }
  ordered.forEach((element, index) => {
    element.z = ordered.length - 1 - index;
  });
  page.elements = ordered;
  return page;
}

export function bringElementToFront(page, elementId) {
  return moveElementLayer(page, elementId, (page.elements?.length ?? 0) + 1);
}

export function sendElementToBack(page, elementId) {
  return moveElementLayer(page, elementId, -(page.elements?.length ?? 0) - 1);
}

export function pageElementById(page, elementId) {
  return page?.elements?.find((element) => element.id === elementId) ?? null;
}

/** Top-most element under a stage point (respects z), or null. */
export function elementAtPoint(page, point, contains) {
  const elements = [...(page?.elements ?? [])]
    .filter((element) => !element.hidden)
    .sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
  return elements.find((element) => contains(element.frame, point)) ?? null;
}
