import { LIMITS, nowIso } from './model.js';
import { isValidSlug } from './slugs.js';

/**
 * Redirects are a project-level FIFO queue. They are not a full history: the
 * last few renames are enough, and a bounded queue keeps the project lean.
 *
 * @typedef {{from: string, toPageId: string, createdAt: string}} Redirect
 */

/**
 * Remove redirects that can no longer be valid: a live page owns the slug, or
 * the target page was deleted. Also de-duplicates by `from`.
 *
 * @param {Redirect[]} redirects
 * @param {Array<{id: string, slug: string}>} pages
 * @returns {Redirect[]}
 */
export function pruneRedirects(redirects = [], pages = []) {
  const liveSlugs = new Set(pages.map((page) => page.slug));
  const pageIds = new Set(pages.map((page) => page.id));
  const seen = new Set();
  const result = [];

  for (const redirect of redirects) {
    if (!redirect || !isValidSlug(redirect.from)) continue;
    if (liveSlugs.has(redirect.from)) continue;
    if (!pageIds.has(redirect.toPageId)) continue;
    if (seen.has(redirect.from)) continue;
    seen.add(redirect.from);
    result.push({
      from: redirect.from,
      toPageId: redirect.toPageId,
      createdAt: redirect.createdAt ?? nowIso()
    });
  }

  return result.slice(-LIMITS.redirects);
}

/**
 * Push a rename into the queue. The oldest entry falls off when the queue is
 * full. The caller passes the current pages so collisions with live slugs and
 * deleted targets are cleaned immediately.
 *
 * @param {Redirect[]} redirects
 * @param {{from: string, toPageId: string}} entry
 * @param {Array<{id: string, slug: string}>} pages
 * @param {() => string} [clock]
 * @returns {Redirect[]}
 */
export function pushRedirect(redirects = [], entry, pages = [], clock = nowIso) {
  if (!isValidSlug(entry.from)) return pruneRedirects(redirects, pages);
  if (!pages.some((page) => page.id === entry.toPageId)) {
    return pruneRedirects(redirects, pages);
  }
  if (pages.some((page) => page.slug === entry.from)) {
    return pruneRedirects(redirects, pages);
  }

  const next = redirects.filter((redirect) => redirect.from !== entry.from);
  next.push({
    from: entry.from,
    toPageId: entry.toPageId,
    createdAt: clock()
  });
  return pruneRedirects(next, pages);
}

/**
 * Apply a page slug rename and return the new redirects queue. The page itself
 * is mutated by the caller through the project command layer.
 *
 * @param {Redirect[]} redirects
 * @param {Array<{id: string, slug: string}>} pages
 * @param {string} pageId
 * @param {string} nextSlug
 * @param {() => string} [clock]
 * @returns {Redirect[]}
 */
export function redirectsForRename(redirects, pages, pageId, nextSlug, clock = nowIso) {
  const previous = pages.find((page) => page.id === pageId);
  if (!previous || previous.slug === nextSlug) {
    return pruneRedirects(redirects, pages);
  }
  const nextPages = pages.map((page) =>
    page.id === pageId ? { ...page, slug: nextSlug } : page
  );
  return pushRedirect(
    redirects.filter((redirect) => redirect.from !== nextSlug),
    { from: previous.slug, toPageId: pageId },
    nextPages,
    clock
  );
}
