import { describe, expect, it } from 'vitest';
import {
  appendPublishHistory,
  PUBLISH_HISTORY_LIMIT
} from '../src/lib/domain/publish/history.js';
import {
  normalizeCustomDomain,
  canonicalBase
} from '../src/lib/domain/publish/domain.js';
import {
  buildManifest,
  githubPagesUrl,
  parseRepo,
  planPublish,
  repoApi,
  treeEntries
} from '../src/lib/domain/publish/plan.js';
import {
  createBlobPayload,
  createCommitPayload,
  createTreePayload,
  pagesSourcePayload,
  updateRefApi
} from '../src/lib/domain/publish/github.js';

describe('publish planning', () => {
  it('parses owner/repo and GitHub URLs', () => {
    expect(parseRepo('srsergiorodriguez/cajita')).toEqual({
      owner: 'srsergiorodriguez',
      name: 'cajita',
      fullName: 'srsergiorodriguez/cajita'
    });
    expect(parseRepo('https://github.com/owner/repo.git').fullName).toBe('owner/repo');
    expect(parseRepo('github.com/owner/repo').fullName).toBe('owner/repo');
    expect(parseRepo('git@github.com:owner/repo.git').fullName).toBe('owner/repo');
    expect(parseRepo('https://owner.github.io/repo/').fullName).toBe('owner/repo');
    expect(parseRepo('not a repo')).toBeNull();
    expect(parseRepo('https://example.com/a/b')).toBeNull();
  });

  it('normalizes custom domains and builds canonical bases', () => {
    expect(normalizeCustomDomain('https://Mi-Sitio.com/path')).toBe('mi-sitio.com');
    expect(normalizeCustomDomain('example.com')).toBe('example.com');
    expect(normalizeCustomDomain('https://example.github.io/repo')).toBe('');
    expect(normalizeCustomDomain('not a domain')).toBe('');
    expect(
      canonicalBase({
        publish: { owner: 'owner', repo: 'repo' },
        meta: {}
      })
    ).toBe('https://owner.github.io/repo/');
    expect(canonicalBase({ publish: { customDomain: 'example.com' }, meta: {} })).toBe(
      'https://example.com/'
    );
  });

  it('keeps the newest five publish history entries', () => {
    let history = [];
    for (let index = 0; index < PUBLISH_HISTORY_LIMIT + 2; index++) {
      history = appendPublishHistory(history, {
        kind: 'publish',
        at: `2026-01-0${index + 1}`
      });
    }
    expect(history).toHaveLength(PUBLISH_HISTORY_LIMIT);
    expect(history[0].at).toBe('2026-01-07');
    expect(history[4].at).toBe('2026-01-03');
  });

  it('builds the project pages URL', () => {
    expect(githubPagesUrl('Owner', 'site')).toBe('https://owner.github.io/site/');
    expect(githubPagesUrl('owner', 'owner.github.io')).toBe('https://owner.github.io/');
  });

  it('hashes every file and plans a first publish', async () => {
    const entries = new Map([
      ['index.html', { bytes: new TextEncoder().encode('hola'), mime: 'text/html' }],
      ['cajita.css', { bytes: new TextEncoder().encode('body{}'), mime: 'text/css' }]
    ]);
    const manifest = await buildManifest(entries);
    expect(Object.keys(manifest)).toEqual(['index.html', 'cajita.css']);
    expect(manifest['index.html'].hash).toHaveLength(64);
    expect(planPublish(manifest, null)).toEqual({
      uploads: ['index.html', 'cajita.css'],
      deletes: [],
      unchanged: []
    });
  });

  it('reuses unchanged blobs and deletes removed paths', () => {
    const current = {
      'index.html': { hash: 'a', size: 1 },
      'new.css': { hash: 'b', size: 1 }
    };
    const cached = {
      manifest: {
        'index.html': { hash: 'a', sha: 'blob-a' },
        'old.png': { hash: 'old', sha: 'blob-old' }
      }
    };
    expect(planPublish(current, cached.manifest)).toEqual({
      uploads: ['new.css'],
      deletes: ['old.png'],
      unchanged: ['index.html']
    });
    expect(treeEntries(current, { 'new.css': 'blob-b' }, cached.manifest)).toEqual([
      { path: 'index.html', mode: '100644', type: 'blob', sha: 'blob-a' },
      { path: 'new.css', mode: '100644', type: 'blob', sha: 'blob-b' },
      { path: 'old.png', mode: '100644', type: 'blob', sha: null }
    ]);
  });

  it('only reuses a cached blob when it has a sha', () => {
    const current = { 'index.html': { hash: 'a', size: 1 } };
    expect(planPublish(current, { 'index.html': { hash: 'a' } }).uploads).toEqual([
      'index.html'
    ]);
  });
});

describe('GitHub request payloads', () => {
  it('encodes blobs as base64', () => {
    expect(createBlobPayload(new TextEncoder().encode('cajita'))).toEqual({
      content: 'Y2FqaXRh',
      encoding: 'base64'
    });
  });

  it('builds tree, commit, and Pages payloads', () => {
    expect(createTreePayload([{ path: 'index.html' }], 'base')).toEqual({
      base_tree: 'base',
      tree: [{ path: 'index.html' }]
    });
    expect(createTreePayload([], null)).toEqual({ tree: [] });
    expect(createCommitPayload('message', 'tree', ['parent'])).toEqual({
      message: 'message',
      tree: 'tree',
      parents: ['parent']
    });
    expect(pagesSourcePayload()).toEqual({
      source: { branch: 'gh-pages', path: '/' }
    });
  });

  it('builds encoded API paths', () => {
    expect(repoApi('owner', 'my repo', '/pages')).toBe('/repos/owner/my%20repo/pages');
    expect(updateRefApi('owner', 'repo')).toBe(
      '/repos/owner/repo/git/refs/heads/gh-pages'
    );
  });
});
