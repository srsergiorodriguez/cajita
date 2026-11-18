let nextId = 1;

export const ui = $state({
  toasts: []
});

/**
 * @param {string} message
 * @param {'info' | 'success' | 'error'} [type]
 * @param {number} [duration]
 */
export function toast(message, type = 'info', duration = 4000) {
  const id = nextId++;
  const ttl = type === 'error' ? Math.max(duration, 10000) : duration;
  ui.toasts = [...ui.toasts, { id, message, type }].slice(-5);
  window.setTimeout(() => dismissToast(id), ttl);
  return id;
}

export function dismissToast(id) {
  ui.toasts = ui.toasts.filter((item) => item.id !== id);
}
