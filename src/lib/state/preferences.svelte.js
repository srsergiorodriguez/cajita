const LOCALE_KEY = 'cajita.locale';
const MODE_KEY = 'cajita.mode';
const UI_SCALE_KEY = 'cajita.uiScale';
const DEFAULT_UI_SCALE = 1.2;
const MIN_UI_SCALE = 0.9;
const MAX_UI_SCALE = 1.3;
const MODES = ['light', 'dark'];
const LOCALES = ['es', 'en'];

const hasWindow = typeof window !== 'undefined';

function read(key, allowed, fallback) {
  if (!hasWindow) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode / disabled storage: the session still works.
  }
}

function readUiScale() {
  if (!hasWindow) return DEFAULT_UI_SCALE;
  try {
    const value = Number.parseFloat(window.localStorage.getItem(UI_SCALE_KEY) ?? '');
    return Number.isFinite(value) && value >= MIN_UI_SCALE && value <= MAX_UI_SCALE
      ? value
      : DEFAULT_UI_SCALE;
  } catch {
    return DEFAULT_UI_SCALE;
  }
}

export const preferences = $state({
  mode: read(MODE_KEY, MODES, 'dark'),
  locale: read(LOCALE_KEY, LOCALES, 'es'),
  uiScale: readUiScale(),
  leftOpen: false,
  inspectorOpen: false,
  leftCollapsed: false,
  inspectorCollapsed: false,
  stripCollapsed: false
});

export function applyPreferences() {
  if (!hasWindow) return;
  document.documentElement.dataset.theme = 'ficha';
  document.documentElement.dataset.mode = preferences.mode;
  document.documentElement.lang = preferences.locale;
  document.documentElement.style.setProperty('--ui-scale', String(preferences.uiScale));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', preferences.mode === 'dark' ? '#12161b' : '#f7f1e5');
  }
}

export function setMode(mode) {
  if (!MODES.includes(mode)) return;
  preferences.mode = mode;
  write(MODE_KEY, mode);
  applyPreferences();
}

export function toggleMode() {
  setMode(preferences.mode === 'light' ? 'dark' : 'light');
}

export function setLocale(locale) {
  if (!LOCALES.includes(locale)) return;
  preferences.locale = locale;
  write(LOCALE_KEY, locale);
  applyPreferences();
}

export function setUiScale(value) {
  const next = Math.min(
    MAX_UI_SCALE,
    Math.max(MIN_UI_SCALE, Number(value) || DEFAULT_UI_SCALE)
  );
  preferences.uiScale = next;
  write(UI_SCALE_KEY, String(next));
  applyPreferences();
}

export function toggleCollapsed(panel) {
  if (panel === 'left') preferences.leftCollapsed = !preferences.leftCollapsed;
  if (panel === 'inspector')
    preferences.inspectorCollapsed = !preferences.inspectorCollapsed;
  if (panel === 'strip') preferences.stripCollapsed = !preferences.stripCollapsed;
}

export function togglePanel(panel) {
  if (panel === 'left') {
    preferences.leftOpen = !preferences.leftOpen;
    preferences.inspectorOpen = false;
  } else if (panel === 'inspector') {
    preferences.inspectorOpen = !preferences.inspectorOpen;
    preferences.leftOpen = false;
  }
}
