import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { sha256Hex } from '../src/lib/domain/assets.js';
import { createElement } from '../src/lib/domain/elements.js';
import {
  buildBundleManifest,
  parseBundleFiles,
  validateBundleManifest
} from '../src/lib/domain/bundle.js';

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
