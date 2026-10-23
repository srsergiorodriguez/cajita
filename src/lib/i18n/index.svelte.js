import { preferences } from '../state/preferences.svelte.js';
import { en } from './en.js';
import { es } from './es.js';

const dictionaries = { en, es };

/**
 * Translate a UI key for the current locale.
 * Spanish is the source of truth in the product; English is a full peer.
 *
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const dictionary = dictionaries[preferences.locale] ?? es;
  const value = dictionary[key] ?? en[key] ?? key;

  return value.replace(/\{(\w+)\}/g, (whole, name) => {
    if (params[name] === undefined) return whole;
    return String(params[name]);
  });
}

export function plural(count, oneKey, manyKey) {
  return t(count === 1 ? oneKey : manyKey, { count });
}

export function localeLabel(locale = preferences.locale) {
  return locale === 'en' ? 'English' : 'Español';
}
