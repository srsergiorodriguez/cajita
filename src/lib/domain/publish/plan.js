/**
 * Normalise a repository reference. v1 targets an existing public repository;
 * create-from-app is deliberately not part of this path.
 */
export function parseRepo(input) {
  let raw = String(input ?? '').trim();
  if (!raw) return null;

  // Accept git@ URLs and bare github.com URLs, not just https:// forms.
  raw = raw.replace(/^git@github\.com:/i, 'https://github.com/');
  if (/^(www\.)?github\.com\//i.test(raw)) raw = `https://${raw}`;
  if (/^[^/]+\.github\.io\//i.test(raw)) raw = `https://${raw}`;

  let owner = '';
  let name = '';
  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw);
      const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
      if (url.hostname.endsWith('.github.io')) {
        owner = url.hostname.slice(0, -'.github.io'.length);
        name = parts[0];
      } else if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
        [owner, name] = parts;
      } else {
        return null;
      }
    } else {
      [owner, name] = raw.split('/');
    }
  } catch {
    return null;
  }
  name = String(name ?? '').replace(/\.git$/i, '');
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(name)) {
    return null;
  }
  if (owner.startsWith('.') || name.startsWith('.')) return null;
  return { owner, name, fullName: `${owner}/${name}` };
}

export function githubPagesUrl(owner, repo) {
  const ownerLower = owner.toLowerCase();
  if (repo.toLowerCase() === `${ownerLower}.github.io`) {
    return `https://${ownerLower}.github.io/`;
  }
  return `https://${ownerLower}.github.io/${repo}/`;
}

export function repoApi(owner, repo, suffix = '') {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${suffix}`;
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildManifest(entries) {
  const manifest = {};
  for (const [path, file] of entries) {
    const digest = await crypto.subtle.digest('SHA-256', file.bytes);
    manifest[path] = { hash: toHex(digest), size: file.bytes.byteLength };
  }
  return manifest;
}

export function planPublish(current, cached) {
  const uploads = [];
  const deletes = [];
  const unchanged = [];
  const cache = cached ?? {};
  for (const [path, file] of Object.entries(current)) {
    const previous = cache[path];
    if (previous?.hash === file.hash && previous?.sha) unchanged.push(path);
    else uploads.push(path);
  }
  for (const path of Object.keys(cache)) {
    if (!current[path]) deletes.push(path);
  }
  return { uploads, deletes, unchanged };
}

export function treeEntries(current, uploadedShas, cached) {
  const tree = [];
  const cache = cached ?? {};
  for (const path of Object.keys(current)) {
    const sha = uploadedShas[path] ?? cache[path]?.sha;
    if (!sha) throw new Error(`Missing blob for ${path}`);
    tree.push({ path, mode: '100644', type: 'blob', sha });
  }
  for (const path of Object.keys(cache)) {
    if (!current[path]) {
      tree.push({ path, mode: '100644', type: 'blob', sha: null });
    }
  }
  return tree;
}
