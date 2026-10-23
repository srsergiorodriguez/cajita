import { buildSiteEntries } from './site-export.js';
import {
  buildManifest,
  githubPagesUrl,
  parseRepo,
  planPublish,
  repoApi,
  treeEntries
} from '../../domain/publish/plan.js';
import {
  blobApi,
  commitApi,
  commitsApi,
  createBlobPayload,
  createCommitPayload,
  createTreePayload,
  latestPagesBuildApi,
  pagesApi,
  pagesSourcePayload,
  refApi,
  refsApi,
  updateRefApi,
  treeApi
} from '../../domain/publish/github.js';

const API = 'https://api.github.com';

export class PublishError extends Error {
  constructor(code, message, { status = 0, detail = '', url = '' } = {}) {
    super(message);
    this.name = 'PublishError';
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.url = url;
  }
}

function codeForStatus(status, context) {
  if (status === 401) return 'PUBLISH_AUTH';
  if (status === 403 && context === 'pages') return 'PUBLISH_PAGES_SETUP';
  if (status === 403) return 'PUBLISH_PERMISSION';
  if (status === 404)
    return context === 'repo' ? 'PUBLISH_REPO_ACCESS' : 'PUBLISH_MISSING';
  if (status === 409 || status === 422) return 'PUBLISH_CONFLICT';
  return 'NETWORK';
}

async function request(token, path, { method = 'GET', body, allow404 = false } = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (cause) {
    throw new PublishError('NETWORK', 'No se pudo conectar con GitHub.', {
      detail: String(cause)
    });
  }

  if (allow404 && response.status === 404) return null;
  if (!response.ok) {
    let detail = '';
    try {
      const data = await response.json();
      detail = data?.message ?? '';
    } catch {
      // Keep the empty detail; never show raw HTML.
    }
    throw new PublishError(
      codeForStatus(response.status, path.endsWith('/pages') ? 'pages' : 'repo'),
      'GitHub rechazó la petición.',
      {
        status: response.status,
        detail: `${method} ${path}${detail ? `: ${detail}` : ''}`
      }
    );
  }
  return response.status === 204 ? null : response.json();
}

async function getRepo(token, owner, repoName) {
  const data = await request(token, repoApi(owner, repoName));
  if (data.private) {
    throw new PublishError(
      'PUBLISH_PRIVATE',
      'GitHub Pages para repositorios privados requiere un plan de pago.'
    );
  }
  return data;
}

async function getBranch(token, owner, repoName, branch) {
  return request(token, refApi(owner, repoName, branch), { allow404: true });
}

async function getPages(token, owner, repoName) {
  return request(token, pagesApi(owner, repoName), { allow404: true });
}

async function getCommit(token, owner, repoName, sha) {
  return request(token, commitsApi(owner, repoName, sha));
}

async function enablePages(token, owner, repoName, branch, customDomain = '') {
  const body = pagesSourcePayload(branch, customDomain);
  try {
    return await request(token, pagesApi(owner, repoName), { method: 'POST', body });
  } catch (error) {
    if (error instanceof PublishError && (error.status === 409 || error.status === 422)) {
      return request(token, pagesApi(owner, repoName), { method: 'PUT', body });
    }
    throw error;
  }
}

async function createCommit(token, owner, repoName, tree, parents) {
  return request(token, commitApi(owner, repoName), {
    method: 'POST',
    body: createCommitPayload(
      `cajita: publish ${new Date().toISOString().slice(0, 10)}`,
      tree,
      parents
    )
  });
}

async function updateBranch(token, owner, repoName, branch, tree, commit, parentSha) {
  const update = async (sha, parent) => {
    const next = await createCommit(token, owner, repoName, tree, parent ? [parent] : []);
    if (parent) {
      await request(token, updateRefApi(owner, repoName, branch), {
        method: 'PATCH',
        body: { sha: next.sha, force: false }
      });
    } else {
      await request(token, refsApi(owner, repoName), {
        method: 'POST',
        body: { ref: `refs/heads/${branch}`, sha: next.sha }
      });
    }
    return next;
  };

  try {
    await request(
      token,
      parentSha ? updateRefApi(owner, repoName, branch) : refsApi(owner, repoName),
      {
        method: parentSha ? 'PATCH' : 'POST',
        body: parentSha
          ? { sha: commit.sha, force: false }
          : { ref: `refs/heads/${branch}`, sha: commit.sha }
      }
    );
    return commit;
  } catch (error) {
    if (
      !(error instanceof PublishError) ||
      (error.status !== 409 && error.status !== 422)
    ) {
      throw error;
    }
    // Another writer moved the branch while the media was uploading. Re-parent
    // the same tree on the current tip and try exactly once more.
    const fresh = await getBranch(token, owner, repoName, branch);
    if (!fresh?.object?.sha) return update(commit.sha, parentSha);
    return update(commit.sha, fresh.object.sha);
  }
}

async function waitForBuild(token, owner, repoName, commit, onProgress) {
  const deadline = Date.now() + 120_000;
  let delay = 1500;
  while (Date.now() < deadline) {
    const build = await request(token, latestPagesBuildApi(owner, repoName), {
      allow404: true
    });
    if (build?.status === 'built') return build;
    if (build?.status === 'errored') {
      throw new PublishError(
        'PUBLISH_BUILD',
        'GitHub Pages no pudo construir el sitio.',
        {
          detail: build.error?.message ?? ''
        }
      );
    }
    onProgress?.('publish.progress.building');
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay + 500, 5000);
  }
  throw new PublishError(
    'PUBLISH_TIMEOUT',
    'GitHub Pages tardó demasiado en construir el sitio.'
  );
}

export async function publishToGithub(project, options = {}) {
  try {
    return await publishToGithubUnsafe(project, options);
  } catch (error) {
    if (error instanceof PublishError) throw error;
    throw new PublishError(
      'PUBLISH_LOCAL',
      'No se pudo preparar el sitio para publicar.',
      { detail: error instanceof Error ? error.message : String(error) }
    );
  }
}

async function publishToGithubUnsafe(
  project,
  { token, repo, branch = 'gh-pages', cached = null, onProgress } = {}
) {
  const parsed = parseRepo(repo);
  if (!parsed)
    throw new PublishError('PUBLISH_REPO', 'Escribe el repositorio como usuario/nombre.');
  if (!token) throw new PublishError('PUBLISH_AUTH', 'Falta el token de GitHub.');

  onProgress?.('publish.progress.prepare');
  const { entries } = await buildSiteEntries(project);
  const manifest = await buildManifest(entries);
  const plan = planPublish(manifest, cached?.manifest);
  const { owner, name: repoName } = parsed;
  const customDomain = project.publish?.customDomain ?? '';

  onProgress?.('publish.progress.check');
  try {
    await getRepo(token, owner, repoName);
  } catch (error) {
    if (error instanceof PublishError && error.code === 'PUBLISH_REPO_ACCESS') {
      error.url = `https://github.com/${owner}/${repoName}`;
    }
    throw error;
  }
  const ref = await getBranch(token, owner, repoName, branch);
  const parentSha = ref?.object?.sha ?? null;
  const baseTree = parentSha
    ? (await getCommit(token, owner, repoName, parentSha)).tree.sha
    : null;

  const uploadedShas = {};
  const uploadPaths = [...new Set(plan.uploads)];
  for (let index = 0; index < uploadPaths.length; index++) {
    const path = uploadPaths[index];
    onProgress?.('publish.progress.upload', {
      current: index + 1,
      total: uploadPaths.length,
      path
    });
    let blob;
    try {
      blob = await request(token, blobApi(owner, repoName), {
        method: 'POST',
        body: createBlobPayload(entries.get(path).bytes)
      });
    } catch (error) {
      if (error instanceof PublishError) {
        const bytes = entries.get(path).bytes.byteLength;
        error.detail = `${path} (${(bytes / (1024 * 1024)).toFixed(1)} MB)\n${error.detail}`;
      }
      throw error;
    }
    uploadedShas[path] = blob.sha;
  }

  const tree = treeEntries(manifest, uploadedShas, cached?.manifest);
  onProgress?.('publish.progress.tree');
  const createdTree = await request(token, treeApi(owner, repoName), {
    method: 'POST',
    body: createTreePayload(tree, baseTree)
  });
  const createdCommit = await createCommit(
    token,
    owner,
    repoName,
    createdTree.sha,
    parentSha ? [parentSha] : []
  );
  const finalCommit = await updateBranch(
    token,
    owner,
    repoName,
    branch,
    createdTree.sha,
    createdCommit,
    parentSha
  );

  onProgress?.('publish.progress.enable');
  const pagesSite = await getPages(token, owner, repoName);
  if (!pagesSite) {
    try {
      await enablePages(token, owner, repoName, branch, customDomain);
    } catch (error) {
      if (error instanceof PublishError && error.code === 'PUBLISH_PAGES_SETUP') {
        error.url = `https://github.com/${owner}/${repoName}/settings/pages`;
        error.detail = `Los archivos ya están en ${branch}. ${error.detail}`.trim();
      }
      throw error;
    }
  }
  onProgress?.('publish.progress.building');
  const build = await waitForBuild(token, owner, repoName, finalCommit.sha, onProgress);

  const nextCache = {};
  for (const path of Object.keys(manifest)) {
    nextCache[path] = {
      hash: manifest[path].hash,
      sha: uploadedShas[path] ?? cached?.manifest?.[path]?.sha
    };
  }

  return {
    url: customDomain ? `https://${customDomain}/` : githubPagesUrl(owner, repoName),
    commit: finalCommit.sha,
    build,
    manifest: nextCache,
    plan: {
      uploaded: uploadPaths.length,
      deleted: plan.deletes.length,
      unchanged: plan.unchanged.length
    }
  };
}


export async function rollbackToGithub({
  token,
  owner,
  repo,
  branch = 'gh-pages',
  commit,
  onProgress
} = {}) {
  if (!token) throw new PublishError('PUBLISH_AUTH', 'Falta el token de GitHub.');
  if (!/^[a-f0-9]{40}$/i.test(String(commit ?? ''))) {
    throw new PublishError('PUBLISH_MISSING', 'El commit de restauración no es válido.');
  }
  await getRepo(token, owner, repo);
  if (!(await getPages(token, owner, repo))) {
    await enablePages(token, owner, repo, branch);
  }
  const target = await getCommit(token, owner, repo, commit);
  const ref = await getBranch(token, owner, repo, branch);
  if (!ref?.object?.sha) {
    throw new PublishError('PUBLISH_MISSING', 'La rama de publicación no existe.');
  }
  onProgress?.('publish.progress.rollback');
  const next = await createCommit(
    token,
    owner,
    repo,
    target.tree.sha,
    [ref.object.sha]
  );
  await request(token, updateRefApi(owner, repo, branch), {
    method: 'PATCH',
    body: { sha: next.sha, force: false }
  });
  const build = await waitForBuild(token, owner, repo, next, onProgress);
  return {
    url: githubPagesUrl(owner, repo),
    commit: next.sha,
    build
  };
}

export async function unpublishFromGithub({ token, repo } = {}) {
  const parsed = parseRepo(repo);
  if (!parsed)
    throw new PublishError('PUBLISH_REPO', 'Escribe el repositorio como usuario/nombre.');
  if (!token) throw new PublishError('PUBLISH_AUTH', 'Falta el token de GitHub.');
  await request(token, pagesApi(parsed.owner, parsed.name), { method: 'DELETE' });
}
