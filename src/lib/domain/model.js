import { makeSlug } from './slugs.js';

export const PROJECT_FORMAT = 'cajita';
export const PROJECT_VERSION = 1;
export const BUNDLE_FORMAT = 'cajita-bundle';
export const BUNDLE_VERSION = 1;

export const LIMITS = Object.freeze({
  projectBytesSoft: 250 * 1024 * 1024,
  projectBytesHard: 500 * 1024 * 1024,
  siteBytesSoft: 200 * 1024 * 1024,
  siteBytesHard: 900 * 1024 * 1024,
  fileBytes: 50 * 1024 * 1024,
  videoFileBytes: 20 * 1024 * 1024,
  imagePixels: 40_000_000,
  images: 80,
  audio: 20,
  videos: 3,
  videoBytes: 100 * 1024 * 1024,
  fonts: 2,
  fontBytes: 5 * 1024 * 1024,
  pagesSoft: 50,
  redirects: 5,
  imageMaxEdge: 2560,
  imageQuality: 0.85,
  highImageQuality: 0.92,
  highImageMaxEdge: 3200,
  importFiles: 2000
});

export const STAGE_PRESETS = Object.freeze([
  { id: 'wide', label: '3:2', width: 1200, height: 800 },
  { id: 'square', label: '1:1', width: 1080, height: 1080 },
  { id: 'portrait', label: '4:5', width: 1080, height: 1350 },
  { id: 'story', label: '9:16', width: 1080, height: 1920 },
  { id: 'letter', label: 'Letter', width: 816, height: 1056 },
  { id: 'a4', label: 'A4', width: 794, height: 1123 }
]);

export const SITE_THEMES = Object.freeze({
  papel: {
    name: 'papel',
    background: '#f6f0e4',
    ink: '#1c1917',
    accent: '#a82a1e',
    muted: '#6b6257',
    pairing: 'editorial',
    texture: 'paper'
  }
});

export const DEFAULT_MEDIA = Object.freeze({
  imageQuality: 'web',
  maxEdge: LIMITS.imageMaxEdge
});

export const DEFAULT_LOCALE = 'es';

export function createId(prefix, factory = defaultIdFactory) {
  return `${prefix}_${factory()}`;
}

export function defaultIdFactory() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(clock = () => new Date()) {
  return clock().toISOString();
}

export function createStage(presetId = 'wide', overrides = {}) {
  const preset = STAGE_PRESETS.find((item) => item.id === presetId) ?? STAGE_PRESETS[0];
  return {
    width: preset.width,
    height: preset.height,
    fit: 'width',
    align: 'center',
    minWidth: 360,
    maxWidth: 1280,
    background: { color: '#fffdf7' },
    ...overrides
  };
}

export function createPage({
  id,
  title = 'Inicio',
  slug,
  existingSlugs = [],
  layout = 'free',
  idFactory
} = {}) {
  return {
    id: id ?? createId('p', idFactory),
    title: title.trim() || 'Inicio',
    slug: slug ?? makeSlug(title || 'Inicio', existingSlugs),
    layout,
    grid:
      layout === 'grid'
        ? {
            preset: 'modular',
            cols: 12,
            rows: 8,
            margin: 40,
            gutter: 24,
            rotationStep: 0
          }
        : undefined,
    transition: 'cut',
    elements: []
  };
}

export function createProject({
  id,
  title = 'Cajita sin título',
  locale = DEFAULT_LOCALE,
  stagePreset = 'wide',
  stageWidth,
  stageHeight,
  idFactory,
  clock
} = {}) {
  const createdAt = nowIso(clock);
  const page = createPage({
    title: 'Inicio',
    existingSlugs: [],
    idFactory
  });

  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    id: id ?? createId('p', idFactory),
    title: title.trim() || 'Cajita sin título',
    slug: makeSlug(title || 'Cajita sin título', []),
    locale: locale === 'en' ? 'en' : 'es',
    createdAt,
    updatedAt: createdAt,
    startPageId: page.id,
    stage: createStage(
      stagePreset,
      Number.isFinite(stageWidth) && Number.isFinite(stageHeight)
        ? { width: stageWidth, height: stageHeight }
        : undefined
    ),
    siteBackground: '#fffdf7',
    theme: SITE_THEMES.papel,
    media: { ...DEFAULT_MEDIA },
    pages: [page],
    assets: {},
    fichaSchema: { fields: [] },
    fichaSettings: { movable: false, showCode: true },
    fichas: {},
    redirects: [],
    fonts: {},
    meta: {
      description: ''
    }
  };
}

export function cloneProject(project, { idFactory } = {}) {
  const copy = JSON.parse(JSON.stringify(project));
  copy.id = createId('p', idFactory);
  copy.createdAt = nowIso();
  copy.updatedAt = copy.createdAt;
  copy.title = project.title;
  copy.slug = makeSlug(project.title, []);
  return copy;
}

export function projectStats(project) {
  const assets = Object.values(project?.assets ?? {});
  const byKind = { image: 0, video: 0, audio: 0, font: 0 };
  let bytes = 0;

  for (const asset of assets) {
    byKind[asset.kind] = (byKind[asset.kind] ?? 0) + 1;
    bytes += Number(asset.bytes) || 0;
  }

  const media = assets.length - (byKind.font ?? 0);
  return {
    pages: project?.pages?.length ?? 0,
    assets: assets.length,
    media,
    fonts: byKind.font ?? 0,
    byKind,
    bytes
  };
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
