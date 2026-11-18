/** Pick a contrasting backdrop for the in-canvas text editor. */
export function textEditorBackground(color) {
  const raw = String(color ?? '').replace('#', '');
  const hex =
    raw.length === 3
      ? raw
          .split('')
          .map((part) => part + part)
          .join('')
      : raw;
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 'var(--stage)';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#171b21' : '#fffdf7';
}
