import { repoApi } from './plan.js';

export function createBlobPayload(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return { content: btoa(binary), encoding: 'base64' };
}

export function createTreePayload(tree, baseTree) {
  return baseTree ? { base_tree: baseTree, tree } : { tree };
}

export function createCommitPayload(message, tree, parents) {
  return { message, tree, parents };
}

export function pagesSourcePayload(branch = 'gh-pages', customDomain = '') {
  return {
    source: { branch, path: '/' },
    ...(customDomain ? { cname: customDomain } : {})
  };
}

export function pagesApi(owner, repo, suffix = '') {
  return repoApi(owner, repo, `/pages${suffix}`);
}

export function refApi(owner, repo, branch = 'gh-pages') {
  return repoApi(owner, repo, `/git/ref/heads/${encodeURIComponent(branch)}`);
}

export function updateRefApi(owner, repo, branch = 'gh-pages') {
  return repoApi(owner, repo, `/git/refs/heads/${encodeURIComponent(branch)}`);
}

export function refsApi(owner, repo) {
  return repoApi(owner, repo, '/git/refs');
}

export function commitsApi(owner, repo, sha) {
  return repoApi(owner, repo, `/git/commits/${encodeURIComponent(sha)}`);
}

export function treeApi(owner, repo) {
  return repoApi(owner, repo, '/git/trees');
}

export function commitApi(owner, repo) {
  return repoApi(owner, repo, '/git/commits');
}

export function blobApi(owner, repo) {
  return repoApi(owner, repo, '/git/blobs');
}

export function latestPagesBuildApi(owner, repo) {
  return repoApi(owner, repo, '/pages/builds/latest');
}
