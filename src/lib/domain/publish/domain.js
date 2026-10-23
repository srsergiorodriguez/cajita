import { githubPagesUrl } from './plan.js';

export const DOMAIN_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function normalizeCustomDomain(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  let host = raw;
  try {
    if (/^https?:\/\//i.test(host)) host = new URL(host).hostname;
    else host = host.split('/')[0].split('?')[0].split('#')[0];
  } catch {
    return '';
  }
  host = host.toLowerCase().replace(/\.$/, '');
  if (host.endsWith('.github.io') || !DOMAIN_RE.test(host)) return '';
  return host;
}

export function canonicalBase(project) {
  const explicit = String(project?.meta?.canonicalUrl ?? '').trim();
  if (explicit) {
    try {
      const url = new URL(explicit);
      if (!/^https?:$/.test(url.protocol)) return '';
      url.hash = '';
      url.search = '';
      return `${url.origin}${url.pathname.replace(/\/?$/, '/')}`;
    } catch {
      return '';
    }
  }

  const domain = normalizeCustomDomain(project?.publish?.customDomain);
  if (domain) return `https://${domain}/`;

  const owner = project?.publish?.owner;
  const repo = project?.publish?.repo;
  if (owner && repo) return githubPagesUrl(owner, repo);
  return '';
}

export function canonicalPageUrl(base, page, startPageId) {
  if (!base) return '';
  if (page.id === startPageId) return base;
  return `${base}${page.slug}/`;
}
