/**
 * The link graph is a pure projection of pages and element links. There is no
 * separate edges table, so it cannot drift from the document.
 */

export const META_FIELDS = Object.freeze([
  'title',
  'creator',
  'date',
  'medium',
  'rights',
  'source',
  'description'
]);

export function emptyMeta() {
  return Object.fromEntries(META_FIELDS.map((field) => [field, '']));
}

export function hasMetaContent(meta) {
  return META_FIELDS.some(
    (field) => typeof meta?.[field] === 'string' && meta[field].trim()
  );
}

export function projectEdges(project) {
  const edges = [];
  for (const page of project?.pages ?? []) {
    for (const element of page.elements ?? []) {
      if (!element.link) continue;
      edges.push({
        pageId: page.id,
        elementId: element.id,
        elementType: element.type,
        target: element.link
      });
    }
  }
  return edges;
}

export function pageLinkCounts(project) {
  const counts = {};
  for (const page of project?.pages ?? []) counts[page.id] = 0;
  for (const edge of projectEdges(project)) {
    if (counts[edge.pageId] !== undefined) counts[edge.pageId] += 1;
  }
  return counts;
}

/**
 * @returns {{
 *   nodes: Array<{pageId, title, slug, start, inbound, outbound, external, cards, orphan, broken}>,
 *   edges: Array<object>,
 *   orphans: string[],
 *   broken: Array<object>
 * }}
 */
export function buildLinkGraph(project) {
  const pages = project?.pages ?? [];
  const edges = projectEdges(project);
  const pageIds = new Set(pages.map((page) => page.id));
  const inbound = new Map(pages.map((page) => [page.id, 0]));
  const outbound = new Map(pages.map((page) => [page.id, 0]));
  const external = new Map(pages.map((page) => [page.id, 0]));
  const cards = new Map(pages.map((page) => [page.id, 0]));
  const broken = [];

  for (const edge of edges) {
    outbound.set(edge.pageId, (outbound.get(edge.pageId) ?? 0) + 1);
    if (edge.target?.kind === 'page') {
      if (pageIds.has(edge.target.pageId)) {
        inbound.set(edge.target.pageId, (inbound.get(edge.target.pageId) ?? 0) + 1);
      } else {
        broken.push(edge);
      }
    } else if (edge.target?.kind === 'url') {
      external.set(edge.pageId, (external.get(edge.pageId) ?? 0) + 1);
    } else if (edge.target?.kind === 'meta') {
      cards.set(edge.pageId, (cards.get(edge.pageId) ?? 0) + 1);
    }
  }

  const nodes = pages.map((page) => {
    const start = page.id === project.startPageId;
    return {
      pageId: page.id,
      title: page.title,
      slug: page.slug,
      start,
      inbound: inbound.get(page.id) ?? 0,
      outbound: outbound.get(page.id) ?? 0,
      external: external.get(page.id) ?? 0,
      cards: cards.get(page.id) ?? 0,
      orphan: !start && (inbound.get(page.id) ?? 0) === 0,
      broken: broken.filter((edge) => edge.pageId === page.id).length
    };
  });

  return {
    nodes,
    edges,
    orphans: nodes.filter((node) => node.orphan).map((node) => node.pageId),
    broken
  };
}

export function isBrokenLink(project, link) {
  return (
    link?.kind === 'page' &&
    !(project?.pages ?? []).some((page) => page.id === link.pageId)
  );
}
