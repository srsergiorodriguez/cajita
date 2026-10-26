import { describe, expect, it } from 'vitest';
import { createProject, LIMITS } from '../src/lib/domain/model.js';
import { createElement } from '../src/lib/domain/elements.js';
import { extensionForMime, kindForMime } from '../src/lib/domain/assets.js';
import { buildSite, usedAssets } from '../src/lib/export/site.js';

describe('HTML visualization', () => {
  it('recognises HTML assets and exports a sandboxed iframe', () => {
    expect(extensionForMime('text/html')).toBe('html');
    expect(kindForMime('text/html')).toBe('html');
    const project = createProject({ title: 'Viz', locale: 'es' });
    project.assets.a_html = {
      id: 'a_html',
      hash: 'h-html',
      kind: 'html',
      name: 'chart.html',
      mime: 'text/html',
      bytes: 120
    };
    const element = createElement('html', {
      project,
      page: project.pages[0],
      asset: project.assets.a_html,
      title: 'Chart'
    });
    project.pages[0].elements.push(element);
    expect(usedAssets(project).map((item) => item.id)).toContain('a_html');
    const site = buildSite(project);
    expect(site.pages[0].html).toContain('class="el el-html"');
    expect(site.pages[0].html).toContain('<iframe');
    expect(site.pages[0].html).toContain('sandbox="allow-scripts');
    expect(site.pages[0].html).toContain('assets/h-html-chart.html');
    expect(site.css).toContain('.el-html iframe');
    expect(site.css).toContain('.el-drawing img');
    expect(site.css).toContain('.el-link:hover');
    expect(site.css).toContain('filter:brightness(1.1)');
    expect(site.css).toContain('.el-text.el-link:hover');
    expect(site.css).toContain('text-decoration-color:var(--link-accent)');
  });

  it('has a 5 MB per-file limit', () => {
    expect(LIMITS.htmlFileBytes).toBe(5 * 1024 * 1024);
  });
});
