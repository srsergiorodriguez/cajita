import { platform } from '../platform/index.js';

const urls = new Map();
const pending = new Map();
const thumbs = new Map();
const thumbPending = new Map();

function keyFor(projectId, assetId) {
  return `${projectId}:${assetId}`;
}

/**
 * Full-size asset URLs are cached for the life of the project session. Without
 * this, an object URL was revoked/recreated whenever a command replaced the
 * project proxy, which made images flash during drag/resize.
 */
export function assetUrl(projectId, assetId) {
  if (!projectId || !assetId) return Promise.resolve(null);
  const key = keyFor(projectId, assetId);
  if (urls.has(key)) return Promise.resolve(urls.get(key));
  if (pending.has(key)) return pending.get(key);

  const request = platform.assets
    .get(projectId, assetId)
    .then((row) => {
      if (!row?.blob) return null;
      const url = URL.createObjectURL(row.blob);
      urls.set(key, url);
      return url;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, request);
  return request;
}

export function thumbUrl(projectId, assetId) {
  if (!projectId || !assetId) return Promise.resolve(null);
  const key = keyFor(projectId, assetId);
  if (thumbs.has(key)) return Promise.resolve(thumbs.get(key));
  if (thumbPending.has(key)) return thumbPending.get(key);

  const request = platform.assets
    .getThumb(projectId, assetId)
    .then((row) => {
      if (!row?.blob) return null;
      const url = URL.createObjectURL(row.blob);
      thumbs.set(key, url);
      return url;
    })
    .finally(() => {
      thumbPending.delete(key);
    });

  thumbPending.set(key, request);
  return request;
}

export function clearAssetUrl(projectId, assetId) {
  const key = keyFor(projectId, assetId);
  const url = urls.get(key);
  if (url) URL.revokeObjectURL(url);
  urls.delete(key);
  const thumb = thumbs.get(key);
  if (thumb) URL.revokeObjectURL(thumb);
  thumbs.delete(key);
}

export function clearAssetUrls(projectId) {
  const prefix = `${projectId}:`;
  for (const [key, url] of urls) {
    if (!key.startsWith(prefix)) continue;
    URL.revokeObjectURL(url);
    urls.delete(key);
  }
  for (const [key, url] of thumbs) {
    if (!key.startsWith(prefix)) continue;
    URL.revokeObjectURL(url);
    thumbs.delete(key);
  }
}
