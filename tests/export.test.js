import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { appendPage } from '../src/lib/domain/pages.js';
import { createElement } from '../src/lib/domain/elements.js';
import { buildSite, pagePath, usedAssets } from '../src/lib/export/site.js';

function fixture() {
  const project = createProject({ title: 'Sitio', locale: 'es' });
  const start = project.pages[0];
  const about = appendPage(project, { title: 'Sobre' });
  project.assets.a_1 = {
    id: 'a_1',
    hash: 'abcdef1234567890',
    kind: 'image',
    name: 'retrato.png',
    mime: 'image/png',
    bytes: 10
  };
  const heading = createElement('text', {
    project,
    page: start,
    text: 'Una casa sin prisa'
  });
  heading.heading = true;
  heading.link = { kind: 'page', pageId: about.id };
  const image = createElement('image', {
    project,
    page: start,
    asset: project.assets.a_1
  });
  image.alt = 'Retrato';
  image.link = { kind: 'meta' };
  image.meta = { title: 'Retrato', creator: 'Sergio' };
  start.elements.push(heading, image);
  project.redirects = [{ from: 'viejo', toPageId: about.id, createdAt: '2026-01-01' }];
  return { project, start, about };
}

describe('site export', () => {
  it('builds page paths and a complete file tree', () => {
    const { project } = fixture();
    const site = buildSite(project);
    const paths = site.files.map((file) => file.path);
    expect(paths).toContain('index.html');
    expect(paths).toContain('sobre/index.html');
    expect(paths).toContain('viejo/index.html');
    expect(site.assets).toHaveLength(1);
    expect(paths).toContain('cajita.css');
    expect(paths).toContain('.nojekyll');
    expect(pagePath(project, project.pages[0])).toBe('index.html');
    expect(pagePath(project, project.pages[1])).toBe('sobre/index.html');
  });

  it('renders links, headings, images, and native details cards', () => {
    const { project, start } = fixture();
    const site = buildSite(project);
    const html = site.pages[0].html;
    expect(html).toContain('href="sobre/"');
    expect(html).toContain('<h1>Una casa sin prisa</h1>');
    expect(html).toContain('src="assets/abcdef1234-retrato.png"');
    expect(html).toContain('<details');
    expect(html).toContain('style="background:#fffdf7"');
    expect(html).toContain('meta-card');
    expect(html).toContain('Retrato');
    expect(html).toContain('Sergio');
    expect(html).not.toContain('__CAJITA');
    expect(start.elements).toHaveLength(2);
  });

  it('uses parent-relative links and assets from nested pages', () => {
    const { project, about } = fixture();
    const back = createElement('text', { project, page: about, text: 'Volver' });
    back.link = { kind: 'page', pageId: project.startPageId };
    const image = createElement('image', {
      project,
      page: about,
      asset: project.assets.a_1
    });
    image.alt = 'Retrato';
    about.elements.push(back, image);
    const nested = buildSite(project).pages.find((page) => page.page.id === about.id);
    expect(nested.html).toContain('href="../index.html"');
    expect(nested.html).toContain('src="../assets/');
  });

  it('writes relative redirect stubs', () => {
    const { project } = fixture();
    const redirectFile = buildSite(project).files.find(
      (file) => file.path === 'viejo/index.html'
    );
    expect(redirectFile.content).toContain('http-equiv="refresh"');
    expect(redirectFile.content).toContain('../sobre/');
  });

  it('adds canonical metadata, sitemap, robots, and CNAME', () => {
    const { project } = fixture();
    project.publish = {
      provider: 'github-pages',
      owner: 'owner',
      repo: 'repo',
      branch: 'gh-pages',
      customDomain: 'example.com'
    };
    project.meta = {
      description: 'Un archivo pequeño.',
      canonicalUrl: 'https://example.com/'
    };
    project.meta.canonicalUrl = 'https://example.com/';
    const site = buildSite(project);
    const paths = site.files.map((file) => file.path);
    expect(paths).toContain('CNAME');
    expect(paths).toContain('sitemap.xml');
    expect(paths).toContain('robots.txt');
    expect(site.files.find((file) => file.path === 'CNAME').content).toBe(
      'example.com\n'
    );
    expect(site.files.find((file) => file.path === 'sitemap.xml').content).toContain(
      'https://example.com/sobre/'
    );
    const html = site.pages[0].html;
    expect(html).toContain('<link rel="canonical" href="https://example.com/"');
    expect(html).toContain('property="og:url" content="https://example.com/"');
  });

  it('exports video with native controls and a styled audio player', () => {
    const { project, start } = fixture();
    project.assets.a_video = {
      id: 'a_video',
      hash: 'video1234567890',
      kind: 'video',
      name: 'clip.mp4',
      mime: 'video/mp4',
      bytes: 20,
      width: 1600,
      height: 900
    };
    project.assets.a_audio = {
      id: 'a_audio',
      hash: 'audio1234567890',
      kind: 'audio',
      name: 'voz.mp3',
      mime: 'audio/mpeg',
      bytes: 20
    };
    const video = createElement('video', {
      project,
      page: start,
      asset: project.assets.a_video
    });
    video.autoplay = true;
    video.loop = true;
    video.fit = 'contain';
    const audio = createElement('audio', {
      project,
      page: start,
      asset: project.assets.a_audio
    });
    audio.label = 'Voz de la casa';
    audio.loop = true;
    start.elements.push(video, audio);
    const html = buildSite(project).pages[0].html;
    expect(html).toContain('<video');
    expect(html).toContain('controls');
    expect(html).toContain('autoplay');
    expect(html).toContain('loop');
    expect(html).toContain('muted');
    expect(html).toContain('object-fit:contain');
    expect(html).toContain('Voz de la casa');
    expect(html).toContain('<audio');
    expect(html).toContain('audio-inner');
    expect(html).toContain('data-audio-toggle');
    expect(html).toContain('data-audio-bar');
  });

  it('opens URL links in the selected window', () => {
    const { project, start } = fixture();
    const external = createElement('text', {
      project,
      page: start,
      text: 'Fuera'
    });
    external.link = { kind: 'url', url: 'https://example.com', newTab: true };
    const same = createElement('text', {
      project,
      page: start,
      text: 'Dentro'
    });
    same.link = { kind: 'url', url: 'https://example.com', newTab: false };
    start.elements.push(external, same);
    const html = buildSite(project).pages[0].html;
    expect(html).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"');
    expect(html.match(/href="https:\/\/example.com"/g)).toHaveLength(2);
    expect(html.match(/target="_blank"/g)).toHaveLength(1);
  });

  it('uses a custom site background behind the stage', () => {
    const { project } = fixture();
    project.siteBackground = '#102030';
    const site = buildSite(project);
    expect(site.css).toContain('background:#102030');
    expect(site.css).toContain('background:#fffdf7');
  });

  it('writes the page transition into the exported HTML and CSS', () => {
    const { project, start } = fixture();
    start.transition = 'fade';
    const site = buildSite(project);
    expect(site.pages[0].html).toContain('data-transition="fade"');
    expect(site.pages[0].html).toContain('pageswap');
    expect(site.pages[0].html).toContain('pagereveal');
    expect(site.css).toContain('@view-transition');
    expect(site.css).toContain('cajita-fade-out');
    expect(site.css).toContain('active-view-transition-type(fade)');
    expect(site.css).toContain('prefers-reduced-motion');
  });

  it('exports allowlisted provider iframes', () => {
    const { project, start } = fixture();
    const youtube = createElement('embed', {
      project,
      page: start,
      provider: 'youtube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Video de prueba'
    });
    const observable = createElement('embed', {
      project,
      page: start,
      provider: 'observable',
      url: 'https://observablehq.com/@d3/bar-chart',
      title: 'Barras'
    });
    start.elements.push(youtube, observable);
    const html = buildSite(project).pages[0].html;
    expect(html).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(html).toContain(
      'sandbox="allow-scripts allow-same-origin allow-presentation"'
    );
    expect(html).toContain('https://observablehq.com/embed/@d3/bar-chart');
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
    expect(html).toContain('referrerpolicy="no-referrer"');
  });

  it('exports shapes as inline SVG in provider colors', () => {
    const { project, start } = fixture();
    start.elements.push(
      createElement('shape', {
        project,
        page: start,
        shape: 'circle',
        fill: '#123456',
        stroke: '#abcdef',
        strokeWidth: 3
      }),
      createElement('shape', {
        project,
        page: start,
        shape: 'triangle',
        fill: '#fedcba',
        stroke: '#111111',
        strokeWidth: 0
      })
    );
    const html = buildSite(project).pages[0].html;
    expect(html).toContain('el-shape');
    expect(html).toContain('<circle cx="50" cy="50" r="50"');
    expect(html).toContain('<polygon points="50,0 100,100 0,100"');
    expect(html).toContain('fill="#123456"');
    expect(html).toContain('stroke-width="3"');
  });

  it('exports a schema-driven ficha card', () => {
    const { project, start } = fixture();
    project.fichaSchema.fields = [
      {
        id: 'fld_author',
        label: 'Autor',
        key: 'autor',
        type: 'text',
        required: false
      }
    ];
    project.fichas.f_1 = {
      id: 'f_1',
      code: 'OBJ-001',
      label: 'Retrato',
      assetId: 'a_1',
      alt: 'Retrato',
      values: { fld_author: 'Ana' }
    };
    start.elements.push(
      createElement('ficha', {
        project,
        page: start,
        fichaId: 'f_1',
        frame: { x: 10, y: 10, w: 200, h: 200, rotation: 0 }
      })
    );
    const html = buildSite(project).pages[0].html;
    expect(html).toContain('el-ficha');
    expect(html).toContain('data-ficha-id="f_1"');
    expect(html).toContain('<h2>Retrato</h2>');
    expect(html).toContain('OBJ-001');
    expect(html).toContain('Autor');
    expect(html).toContain('Ana');
    expect(usedAssets(project).some((asset) => asset.id === 'a_1')).toBe(true);
    project.fichaSettings.movable = true;
    const movable = buildSite(project).pages[0].html;
    expect(movable).toContain('ficha-reset');
    expect(movable).toContain('data-ficha-project');
    expect(movable).toContain('data-ficha-page');
    project.fichaSettings.showCode = false;
    expect(buildSite(project).pages[0].html).not.toContain('OBJ-001');
  });

  it('adds the movable ficha runtime only when enabled', () => {
    const { project } = fixture();
    project.fichaSettings.movable = true;
    const site = buildSite(project);
    expect(site.pages[0].html).toContain('data-ficha-movable="true"');
    const js = site.files.find((file) => file.path === 'cajita.js');
    expect(js.content).toContain('is-movable');
    expect(js.content).toContain('pointermove');
    expect(js.content).toContain('localStorage');
    expect(js.content).toContain('data-ficha-reset');
    project.fichaSettings.movable = false;
    const fixed = buildSite(project);
    expect(fixed.pages[0].html).not.toContain('data-ficha-movable');
    expect(fixed.files.find((file) => file.path === 'cajita.js').content).not.toContain(
      'is-movable'
    );
    expect(fixed.files.find((file) => file.path === 'cajita.js').content).toContain(
      "querySelectorAll('.audio-inner')"
    );
  });

  it('only lists assets actually referenced', () => {
    const { project } = fixture();
    project.assets.unused = {
      id: 'unused',
      hash: 'unused',
      kind: 'image',
      name: 'unused.png',
      mime: 'image/png',
      bytes: 1
    };
    expect(usedAssets(project).map((asset) => asset.id)).toEqual(['a_1']);
  });

  it('uses cqw typography and shared frame percentages', () => {
    const { project } = fixture();
    const css = buildSite(project).css;
    const html = buildSite(project).pages[0].html;
    expect(css).toContain('container-type:size');
    expect(html).toContain('--x:');
    expect(html).toContain('--w:');
    expect(html).toContain('cqw');
  });
});
