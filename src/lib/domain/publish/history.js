export const PUBLISH_HISTORY_LIMIT = 5;

export function appendPublishHistory(history, entry) {
  if (!entry)
    return Array.isArray(history) ? history.slice(0, PUBLISH_HISTORY_LIMIT) : [];
  return [entry, ...(Array.isArray(history) ? history : [])].slice(
    0,
    PUBLISH_HISTORY_LIMIT
  );
}
