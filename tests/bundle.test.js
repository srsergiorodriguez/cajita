import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { sha256Hex } from '../src/lib/domain/assets.js';
import { createElement } from '../src/lib/domain/elements.js';
import {
  buildBundleManifest,
  parseBundleFiles,
  validateBundleManifest
} from '../src/lib/domain/bundle.js';
import { cloneProject } from '../src/lib/domain/model.js';
import { createComposition, createCompositionChild } from '../src/lib/domain/composition.js';

const enc = new TextEncoder();

async function fixture() {
  let n = 0;
  const project = createProject({
    title: 'Prueba',
    idFactory: () => `id-${++n}`,
    clock: () => new Date('2026-10-22T00:00:00.000Z')
  });
  const bytes = enc.encode('imagen de prueba');
  const hash = await sha256Hex(bytes);
  const meta = {
    id: 'a_1',
    hash,
    kind: 'image',
    name: 'prueba.png',
    mime: 'image/png',
    bytes: bytes.byteLength,
    createdAt: '2026-10-22T00:00:00.000Z'
  };
  project.assets.a_1 = meta;
  project.pages[0].elements.push(
    createElement('text', { project, page: project.pages[0], text: 'Hola' })
  );
  const projectJson = enc.encode(JSON.stringify(project));
  const projectHash = await sha256Hex(projectJson);
  const manifest = buildBundleManifest(project, [{ meta }], {
    createdAt: '2026-10-22T00:00:00.000Z',
    projectHash
  });
  const files = {
    'bundle.json': enc.encode(JSON.stringify(manifest)),
    'project.json': projectJson,
    [manifest.assets[0].path]: bytes
  };
  return { project, meta, bytes, manifest, files, projectJson };
}

describe('bundle manifest', () => {
  it('builds a safe manifest and validates it', async () => {
    const { manifest } = await fixture();
    expect(validateBundleManifest(manifest).ok).toBe(true);
    expect(manifest.assets[0].path).toMatch(/^assets\//);
    expect(manifest.assets[0].hash).toHaveLength(64);
  });

  it('rejects path traversal and duplicate assets', async () => {
    const { manifest } = await fixture();
    manifest.assets[0].path = '../fuera.png';
    const unsafe = validateBundleManifest(manifest);
    expect(unsafe.ok).toBe(false);
    expect(unsafe.errors.some((error) => error.message === 'unsafe path')).toBe(true);

    const { manifest: duplicate } = await fixture();
    duplicate.assets.push({ ...duplicate.assets[0], path: 'assets/otro.png' });
    expect(validateBundleManifest(duplicate).ok).toBe(false);
  });
});

describe('minimal bundle round-trip', () => {
  it('opens a project with no assets', async () => {
    const project = createProject({ title: 'Sin medios' });
    const projectJson = enc.encode(JSON.stringify(project));
    const manifest = buildBundleManifest(project, [], {
      createdAt: '2026-11-17T00:00:00.000Z',
      projectHash: await sha256Hex(projectJson)
    });
    const result = await parseBundleFiles({
      'bundle.json': enc.encode(JSON.stringify(manifest)),
      'project.json': projectJson
    });
    expect(result.ok).toBe(true);
    expect(result.assets).toHaveLength(0);
    expect(result.project.title).toBe('Sin medios');
  });
});

describe('comprehensive bundle round-trip', () => {
  it('keeps compositions, collections, HTML, fonts, and thumbs', async () => {
    const project = createProject({ title: 'Completo', locale: 'es' });
    const imageBytes = enc.encode('image');
    const htmlBytes = enc.encode('<p>hola</p>');
    const fontBytes = enc.encode('font');
    const thumbBytes = enc.encode('thumb');
    const addAsset = async (id, kind, name, mime, bytes, extra = {}) => {
      const hash = await sha256Hex(bytes);
      project.assets[id] = {
        id, hash, kind, name, mime, bytes: bytes.byteLength,
        createdAt: '2026-11-17T00:00:00.000Z', ...extra
      };
      return { meta: project.assets[id], bytes };
    };
    const image = await addAsset('a_img', 'image', 'foto.png', 'image/png', imageBytes);
    const html = await addAsset('a_html', 'html', 'pieza.html', 'text/html', htmlBytes);
    const font = await addAsset('a_font', 'font', 'fuente.woff2', 'font/woff2', fontBytes);
    project.fonts = {
      f_custom: {
        id: 'f_custom',
        name: 'Custom',
        family: 'Custom',
        assetId: 'a_font',
        format: 'woff2'
      }
    };
    project.drawings = {
      drw_1: { id: 'drw_1', assetId: 'a_img', updatedAt: '2026-11-17T00:00:00.000Z' }
    };
    project.fichas = {
      f_1: {
        id: 'f_1',
        code: 'A-1',
        label: 'Ficha',
        alt: 'Ficha',
        assetId: 'a_img',
        values: {}
      }
    };
    const composition = createComposition('button');
    composition.frames[0].children = [
      createCompositionChild('image', { assetId: 'a_img', frame: { x: 0, y: 0, w: 100, h: 100 } })
    ];
    const page = project.pages[0];
    page.elements.push(
      createElement('composition', { project, page, composition }),
      createElement('html', { project, page, asset: project.assets.a_html }),
      createElement('fichaCollection', { project, page })
    );
    const projectJson = enc.encode(JSON.stringify(project));
    const projectHash = await sha256Hex(projectJson);
    const manifest = buildBundleManifest(project, [image, html, font], {
      createdAt: '2026-11-17T00:00:00.000Z',
      projectHash
    });
    manifest.thumbs = [{ assetId: 'a_img', path: 'thumbs/a_img.webp', hash: await sha256Hex(thumbBytes) }];
    const files = {
      'bundle.json': enc.encode(JSON.stringify(manifest)),
      'project.json': projectJson,
      'assets/a_img.png': imageBytes,
      'assets/a_html.html': htmlBytes,
      'assets/a_font.woff2': fontBytes,
      'thumbs/a_img.webp': thumbBytes
    };
    // Paths are generated by assetBundlePath; align the test files with the manifest.
    for (const asset of manifest.assets) {
      files[asset.path] = asset.id === 'a_img' ? imageBytes : asset.id === 'a_html' ? htmlBytes : fontBytes;
    }
    const result = await parseBundleFiles(files);
    expect(result.ok).toBe(true);
    expect(result.project.pages[0].elements.some((item) => item.type === 'composition')).toBe(true);
    expect(result.project.pages[0].elements.some((item) => item.type === 'fichaCollection')).toBe(true);
    expect(result.project.pages[0].elements.some((item) => item.type === 'html')).toBe(true);
    expect(result.assets).toHaveLength(3);
    expect(result.thumbs.a_img).toEqual(thumbBytes);
    const copy = cloneProject(result.project);
    expect(copy.id).not.toBe(result.project.id);
    expect(copy.slug).toBe(result.project.slug);
  });
});

describe('bundle parsing', () => {
  it('round-trips a project, its asset bytes, and its hash', async () => {
    const { files, meta } = await fixture();
    const result = await parseBundleFiles(files);
    expect(result.ok).toBe(true);
    expect(result.project.title).toBe('Prueba');
    expect(result.project.pages[0].elements[0].text).toBe('Hola');
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].meta.id).toBe(meta.id);
    expect(result.assets[0].bytes).toEqual(enc.encode('imagen de prueba'));
  });

  it('rejects a missing asset', async () => {
    const { files, manifest } = await fixture();
    delete files[manifest.assets[0].path];
    const result = await parseBundleFiles(files);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.message.includes('missing'))).toBe(true);
  });

  it('rejects a hash mismatch', async () => {
    const { files, manifest, meta } = await fixture();
    files[manifest.assets[0].path] = new Uint8Array(meta.bytes).fill(1);
    const result = await parseBundleFiles(files);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.message === 'hash does not match')).toBe(
      true
    );
  });

  it('rejects a projectHash mismatch', async () => {
    const { files } = await fixture();
    const manifest = JSON.parse(new TextDecoder().decode(files['bundle.json']));
    manifest.projectHash = '0'.repeat(64);
    files['bundle.json'] = enc.encode(JSON.stringify(manifest));
    const result = await parseBundleFiles(files);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.path === 'projectHash')).toBe(true);
  });
});
