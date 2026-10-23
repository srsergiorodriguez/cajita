export const RESERVED_SLUGS = new Set([
  'assets',
  'index',
  '404',
  'cajita',
  'sitemap',
  'robots'
]);

/**
 * Turn a title into a URL segment. Diacritics are transliterated, spaces and
 * punctuation become hyphens, and the result is trimmed to a safe length.
 *
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(slug);
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isValidSlug(slug) {
  return (
    typeof slug === 'string' &&
    slug.length > 0 &&
    slug.length <= 80 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !isReservedSlug(slug)
  );
}

/**
 * Produce a unique, safe slug. Reserved words get a "-pagina" suffix rather
 * than being silently accepted.
 *
 * @param {string} input
 * @param {string[]} [existing]
 * @returns {string}
 */
export function makeSlug(input, existing = []) {
  const base = slugify(input) || 'pagina';
  const taken = new Set(existing.map((value) => slugify(value)));
  let candidate = isReservedSlug(base) ? `${base}-pagina` : base;
  let suffix = 2;

  while (taken.has(candidate) || isReservedSlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
