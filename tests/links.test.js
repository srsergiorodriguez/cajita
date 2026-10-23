import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { appendPage } from '../src/lib/domain/pages.js';
import { createElement } from '../src/lib/domain/elements.js';
import { validateProject } from '../src/lib/domain/project.js';
import { emptyMeta, hasMetaContent } from '../src/lib/domain/links.js';
import {
  buildLinkGraph,
  isBrokenLink,
  pageLinkCounts,
  projectEdges
} from '../src/lib/domain/links.js';

function fixture() {
  const project = createProject({ title: 'Grafo' });
  const start = project.pages[0];
  const about = appendPage(project, { title: 'Sobre' });
  const contact = appendPage(project, { title: 'Contacto' });
  return { project, start, about, contact };
}

describe('link graph', () => {
  it('projects edges from element links', () => {
    const { project, start, about } = fixture();
    const element = createElement('text', {
      project,
      page: start,
      text: 'Ir a sobre'
    });
    element.link = { kind: 'page', pageId: about.id };
    start.elements.push(element);
    expect(projectEdges(project)).toHaveLength(1);
    expect(pageLinkCounts(project)[start.id]).toBe(1);
  });

  it('marks pages with no inbound links as orphans', () => {
    const { project, start } = fixture();
    const element = createElement('text', {
      project,
      page: start,
      text: 'Inicio'
    });
    start.elements.push(element);
    const graph = buildLinkGraph(project);
    expect(graph.orphans).toHaveLength(2);
    expect(graph.nodes.find((node) => node.pageId === start.id).orphan).toBe(false);
  });

  it('counts inbound links and marks the target reachable', () => {
    const { project, start, about } = fixture();
    const element = createElement('text', {
      project,
      page: start,
      text: 'Sobre'
    });
    element.link = { kind: 'page', pageId: about.id };
    start.elements.push(element);
    const graph = buildLinkGraph(project);
    const node = graph.nodes.find((item) => item.pageId === about.id);
    expect(node.inbound).toBe(1);
    expect(node.orphan).toBe(false);
    expect(node.outbound).toBe(0);
  });

  it('reports broken page links', () => {
    const { project, start } = fixture();
    const element = createElement('text', {
      project,
      page: start,
      text: 'Rota'
    });
    element.link = { kind: 'page', pageId: 'p_missing' };
    start.elements.push(element);
    const graph = buildLinkGraph(project);
    expect(graph.broken).toHaveLength(1);
    expect(graph.broken[0].target.pageId).toBe('p_missing');
    expect(isBrokenLink(project, element.link)).toBe(true);
  });

  it('requires content for a metadata link', () => {
    const { project, start } = fixture();
    const element = createElement('text', { project, page: start, text: 'Ficha' });
    element.link = { kind: 'meta' };
    element.meta = emptyMeta();
    start.elements.push(element);
    expect(validateProject(project).ok).toBe(false);
    element.meta.title = 'Retrato';
    expect(hasMetaContent(element.meta)).toBe(true);
    expect(validateProject(project).ok).toBe(true);
  });

  it('rejects unsafe URL schemes', () => {
    const { project, start } = fixture();
    const element = createElement('text', { project, page: start, text: 'Fuera' });
    element.link = { kind: 'url', url: 'javascript:alert(1)' };
    start.elements.push(element);
    expect(validateProject(project).ok).toBe(false);
  });

  it('counts URL and card links separately from page edges', () => {
    const { project, start } = fixture();
    const url = createElement('text', { project, page: start, text: 'Fuera' });
    url.link = { kind: 'url', url: 'https://example.com' };
    const card = createElement('text', { project, page: start, text: 'Ficha' });
    card.link = { kind: 'meta' };
    card.meta = { title: 'Ficha' };
    start.elements.push(url, card);
    const graph = buildLinkGraph(project);
    const node = graph.nodes.find((item) => item.pageId === start.id);
    expect(node.external).toBe(1);
    expect(node.cards).toBe(1);
    expect(graph.edges.filter((edge) => edge.target.kind === 'page')).toHaveLength(0);
  });
});
