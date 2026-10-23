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
  ui.toasts = [...ui.toasts, { id, message, type }];
  if (type !== 'error') {
    window.setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

export function dismissToast(id) {
  ui.toasts = ui.toasts.filter((item) => item.id !== id);
}
