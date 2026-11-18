/** List non-font assets once, deduplicated by content hash when available. */
export function mediaAssets(project) {
  const seen = new Set();
  return Object.values(project?.assets ?? {}).filter((asset) => {
    if (asset.kind === 'font') return false;
    const key = asset.hash || asset.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
