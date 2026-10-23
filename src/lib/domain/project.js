import {
  LIMITS,
  PROJECT_FORMAT,
  PROJECT_VERSION,
  SITE_THEMES,
  STAGE_PRESETS
} from './model.js';
import { isValidSlug, isReservedSlug } from './slugs.js';
import { META_FIELDS } from './links.js';
import { parseEmbed } from './embeds.js';
import { BUILTIN_FONTS as BUILTIN_FONT_LIST } from './elements.js';
import { FICHA_LIMITS, fichaFieldErrors, isSafeFichaUrl } from './fichas.js';

const BUILTIN_FONTS = new Set(BUILTIN_FONT_LIST.map((font) => font.id));

const ASSET_KINDS = new Set(['image', 'video', 'audio', 'font']);
const ELEMENT_TYPES = new Set([
  'image',
  'text',
  'video',
  'audio',
  'embed',
  'shape',
  'ficha'
]);
const PAIRINGS = new Set(['editorial', 'poster', 'technical', 'slab']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function push(errors, path, message) {
  errors.push({ path, message });
}

function checkFrame(frame, path, errors) {
  if (!isObject(frame)) {
    push(errors, path, 'frame is required');
    return;
  }
  for (const key of ['x', 'y', 'w', 'h', 'rotation']) {
    if (!isFiniteNumber(frame[key])) push(errors, `${path}.${key}`, 'must be a number');
  }
  if (isFiniteNumber(frame.w) && frame.w <= 0)
    push(errors, `${path}.w`, 'must be positive');
  if (isFiniteNumber(frame.h) && frame.h <= 0)
    push(errors, `${path}.h`, 'must be positive');
}

function checkLink(link, path, project, errors) {
  if (link === undefined || link === null) return;
  if (!isObject(link)) {
    push(errors, path, 'link must be an object or null');
    return;
  }
  if (link.kind === 'page') {
    if (!project.pages.some((page) => page.id === link.pageId)) {
      push(errors, `${path}.pageId`, 'target page does not exist');
    }
  } else if (link.kind === 'url') {
    if (typeof link.url !== 'string' || !/^(https?:|mailto:|tel:)/i.test(link.url)) {
      push(errors, `${path}.url`, 'must be an http(s), mailto, or tel URL');
    }
    if (link.newTab !== undefined && typeof link.newTab !== 'boolean') {
      push(errors, `${path}.newTab`, 'must be a boolean');
    }
  } else if (link.kind === 'meta') {
    // The element's meta object is checked separately.
  } else {
    push(errors, `${path}.kind`, 'unknown link kind');
  }
}

function checkAssetRef(assetId, kind, path, project, errors) {
  const asset = project.assets?.[assetId];
  if (!asset) {
    push(errors, path, `asset ${assetId} does not exist`);
  } else if (kind && asset.kind !== kind) {
    push(errors, path, `asset must be of kind ${kind}`);
  }
}

function checkElement(element, pageIndex, elementIndex, project, errors, headings) {
  const path = `pages[${pageIndex}].elements[${elementIndex}]`;
  if (!isObject(element)) {
    push(errors, path, 'element must be an object');
    return;
  }
  if (typeof element.id !== 'string' || !element.id)
    push(errors, `${path}.id`, 'required');
  if (!ELEMENT_TYPES.has(element.type))
    push(errors, `${path}.type`, 'unknown element type');
  checkFrame(element.frame, `${path}.frame`, errors);
  if (!isFiniteNumber(element.z)) push(errors, `${path}.z`, 'must be a number');
  if (!isFiniteNumber(element.opacity))
    push(errors, `${path}.opacity`, 'must be a number');
  checkLink(element.link, `${path}.link`, project, errors);

  if (element.meta !== undefined && element.meta !== null) {
    if (!isObject(element.meta)) {
      push(errors, `${path}.meta`, 'must be an object');
    } else {
      for (const field of META_FIELDS) {
        if (
          element.meta[field] !== undefined &&
          typeof element.meta[field] !== 'string'
        ) {
          push(errors, `${path}.meta.${field}`, 'must be a string');
        }
      }
    }
  }
  if (element.link?.kind === 'meta') {
    if (!isObject(element.meta)) {
      push(errors, `${path}.meta`, 'a metadata link needs a meta object');
    } else if (
      !META_FIELDS.some(
        (field) => typeof element.meta[field] === 'string' && element.meta[field].trim()
      )
    ) {
      push(errors, `${path}.meta`, 'a metadata card needs at least one field');
    }
  }

  if (element.type === 'image') {
    checkAssetRef(element.assetId, 'image', `${path}.assetId`, project, errors);
    if (typeof element.alt !== 'string')
      push(errors, `${path}.alt`, 'required for images');
    if (element.fit && !['cover', 'contain'].includes(element.fit)) {
      push(errors, `${path}.fit`, 'must be cover or contain');
    }
    if (element.mask !== undefined) {
      if (!Array.isArray(element.mask)) {
        push(errors, `${path}.mask`, 'must be an array');
      } else if (element.mask.length ? element.mask.length < 3 : false) {
        push(errors, `${path}.mask`, 'needs at least 3 points');
      } else {
        for (const point of element.mask) {
          if (
            !point ||
            !isFiniteNumber(point.x) ||
            !isFiniteNumber(point.y) ||
            point.x < 0 ||
            point.x > 100 ||
            point.y < 0 ||
            point.y > 100
          ) {
            push(errors, `${path}.mask`, 'points must be within 0–100');
            break;
          }
        }
      }
    }
  }

  if (element.type === 'video') {
    checkAssetRef(element.assetId, 'video', `${path}.assetId`, project, errors);
    if (element.fit && !['cover', 'contain'].includes(element.fit)) {
      push(errors, `${path}.fit`, 'must be cover or contain');
    }
  }

  if (element.type === 'audio') {
    checkAssetRef(element.assetId, 'audio', `${path}.assetId`, project, errors);
  }

  if (element.type === 'shape') {
    if (!['circle', 'square', 'triangle'].includes(element.shape)) {
      push(errors, `${path}.shape`, 'must be circle, square, or triangle');
    }
    if (!/^#[0-9a-f]{6}$/i.test(element.fill ?? '')) {
      push(errors, `${path}.fill`, 'must be a hex color');
    }
    if (!/^#[0-9a-f]{6}$/i.test(element.stroke ?? '')) {
      push(errors, `${path}.stroke`, 'must be a hex color');
    }
    if (
      typeof element.strokeWidth !== 'number' ||
      element.strokeWidth < 0 ||
      element.strokeWidth > 40
    ) {
      push(errors, `${path}.strokeWidth`, 'must be 0–40');
    }
  }

  if (element.type === 'embed') {
    if (!['youtube', 'observable', 'p5'].includes(element.provider)) {
      push(errors, `${path}.provider`, 'must be youtube, observable, or p5');
    } else if (!parseEmbed(element.provider, element.url)) {
      push(errors, `${path}.url`, 'must be a valid provider URL');
    }
    if (typeof element.title !== 'string') {
      push(errors, `${path}.title`, 'must be a string');
    }
    if (element.caption !== undefined && typeof element.caption !== 'string') {
      push(errors, `${path}.caption`, 'must be a string');
    }
  }

  if (element.type === 'ficha') {
    if (typeof element.fichaId !== 'string' || !project.fichas?.[element.fichaId]) {
      push(errors, `${path}.fichaId`, 'must reference an existing ficha');
    }
  }

  if (element.type === 'text') {
    if (typeof element.text !== 'string')
      push(errors, `${path}.text`, 'must be a string');
    const fontKnown =
      BUILTIN_FONTS.has(element.font) || Boolean(project.fonts?.[element.font]);
    if (!fontKnown) push(errors, `${path}.font`, 'unknown font');
    for (const key of ['fontSize', 'lineHeight', 'letterSpacing']) {
      if (!isFiniteNumber(element[key]))
        push(errors, `${path}.${key}`, 'must be a number');
    }
    if (!['left', 'center', 'right'].includes(element.align)) {
      push(errors, `${path}.align`, 'must be left, center, or right');
    }
    if (typeof element.color !== 'string') {
      push(errors, `${path}.color`, 'must be a color string');
    }
    if (
      element.background !== undefined &&
      element.background !== null &&
      typeof element.background !== 'string'
    ) {
      push(errors, `${path}.background`, 'must be a color string or null');
    }
    if (element.padding !== undefined && !isFiniteNumber(element.padding)) {
      push(errors, `${path}.padding`, 'must be a number');
    }
    if (element.heading) {
      headings.count += 1;
      if (headings.count > 1)
        push(errors, `${path}.heading`, 'only one heading per page');
    }
  }
}

function checkPage(page, index, project, errors) {
  const path = `pages[${index}]`;
  if (!isObject(page)) {
    push(errors, path, 'page must be an object');
    return;
  }
  if (typeof page.id !== 'string' || !page.id) push(errors, `${path}.id`, 'required');
  if (typeof page.title !== 'string' || !page.title.trim()) {
    push(errors, `${path}.title`, 'required');
  }
  if (!isValidSlug(page.slug)) push(errors, `${path}.slug`, 'must be a valid slug');
  if (!['free', 'grid'].includes(page.layout)) {
    push(errors, `${path}.layout`, 'must be free or grid');
  }
  if (page.layout === 'grid') {
    if (!isObject(page.grid)) {
      push(errors, `${path}.grid`, 'required for grid pages');
    } else {
      if (!['modular', 'type'].includes(page.grid.preset)) {
        push(errors, `${path}.grid.preset`, 'must be modular or type');
      }
      for (const key of ['cols', 'rows', 'margin', 'gutter']) {
        if (!isFiniteNumber(page.grid[key])) {
          push(errors, `${path}.grid.${key}`, 'must be a number');
        }
      }
    }
  }
  if (!['cut', 'fade', 'slide'].includes(page.transition)) {
    push(errors, `${path}.transition`, 'must be cut, fade, or slide');
  }
  if (
    page.background !== undefined &&
    (!isObject(page.background) || typeof page.background.color !== 'string')
  ) {
    push(errors, `${path}.background`, 'requires a color');
  }
  if (!Array.isArray(page.elements)) {
    push(errors, `${path}.elements`, 'must be an array');
    return;
  }

  const headings = { count: 0 };
  page.elements.forEach((element, elementIndex) => {
    checkElement(element, index, elementIndex, project, errors, headings);
  });
}

/**
 * Validate a project after migration. This is intentionally strict: an invalid
 * project is not opened, because a half-valid document is worse than a clear
 * error and a recovery path.
 *
 * @param {object} project
 * @returns {{ok: boolean, errors: Array<{path: string, message: string}>}}
 */
export function validateProject(project) {
  const errors = [];

  if (!isObject(project)) {
    return { ok: false, errors: [{ path: '', message: 'project must be an object' }] };
  }

  if (project.format !== PROJECT_FORMAT) {
    push(errors, 'format', `must be ${PROJECT_FORMAT}`);
  }
  if (project.version !== PROJECT_VERSION) {
    push(errors, 'version', `must be ${PROJECT_VERSION}`);
  }
  if (typeof project.id !== 'string' || !project.id) push(errors, 'id', 'required');
  if (typeof project.title !== 'string' || !project.title.trim()) {
    push(errors, 'title', 'required');
  }
  if (!['es', 'en'].includes(project.locale)) push(errors, 'locale', 'must be es or en');
  if (typeof project.startPageId !== 'string') push(errors, 'startPageId', 'required');

  if (!isObject(project.stage)) {
    push(errors, 'stage', 'required');
  } else {
    for (const key of ['width', 'height', 'minWidth', 'maxWidth']) {
      if (!isFiniteNumber(project.stage[key]) || project.stage[key] <= 0) {
        push(errors, `stage.${key}`, 'must be a positive number');
      }
    }
    if (!['contain', 'width'].includes(project.stage.fit)) {
      push(errors, 'stage.fit', 'must be contain or width');
    }
    if (!['center', 'left'].includes(project.stage.align)) {
      push(errors, 'stage.align', 'must be center or left');
    }
    if (
      !isObject(project.stage.background) ||
      typeof project.stage.background.color !== 'string'
    ) {
      push(errors, 'stage.background', 'requires a color');
    }
  }

  if (!isObject(project.theme)) {
    push(errors, 'theme', 'required');
  } else {
    if (!SITE_THEMES[project.theme.name])
      push(errors, 'theme.name', 'unknown site theme');
    if (!PAIRINGS.has(project.theme.pairing))
      push(errors, 'theme.pairing', 'unknown pairing');
    for (const key of ['background', 'ink', 'accent']) {
      if (typeof project.theme[key] !== 'string')
        push(errors, `theme.${key}`, 'required');
    }
  }

  if (!isObject(project.media)) {
    push(errors, 'media', 'required');
  } else {
    if (!['web', 'high'].includes(project.media.imageQuality)) {
      push(errors, 'media.imageQuality', 'must be web or high');
    }
    if (![LIMITS.imageMaxEdge, LIMITS.highImageMaxEdge].includes(project.media.maxEdge)) {
      push(errors, 'media.maxEdge', 'must be 2560 or 3200');
    }
  }

  if (!isObject(project.assets)) {
    push(errors, 'assets', 'must be an object');
  } else {
    const counts = { image: 0, video: 0, audio: 0, font: 0 };
    let videoBytes = 0;
    for (const [id, asset] of Object.entries(project.assets)) {
      if (!isObject(asset)) {
        push(errors, `assets.${id}`, 'must be an object');
        continue;
      }
      if (asset.id !== id) push(errors, `assets.${id}.id`, 'must match its key');
      if (!ASSET_KINDS.has(asset.kind)) push(errors, `assets.${id}.kind`, 'unknown kind');
      if (typeof asset.hash !== 'string' || !asset.hash) {
        push(errors, `assets.${id}.hash`, 'required');
      }
      if (typeof asset.name !== 'string' || !asset.name) {
        push(errors, `assets.${id}.name`, 'required');
      }
      if (!isFiniteNumber(asset.bytes) || asset.bytes < 0) {
        push(errors, `assets.${id}.bytes`, 'must be a number');
      } else {
        if (asset.bytes > LIMITS.fileBytes) {
          push(errors, `assets.${id}.bytes`, 'larger than the 50 MB file limit');
        }
        if (asset.kind === 'font' && asset.bytes > LIMITS.fontBytes) {
          push(errors, `assets.${id}.bytes`, 'font larger than 5 MB');
        }
      }
      if (counts[asset.kind] !== undefined) counts[asset.kind] += 1;
      if (asset.kind === 'video') videoBytes += Number(asset.bytes) || 0;
    }

    if (counts.image > LIMITS.images) push(errors, 'assets', 'too many images');
    if (counts.audio > LIMITS.audio) push(errors, 'assets', 'too many audio files');
    if (counts.video > LIMITS.videos) push(errors, 'assets', 'too many videos');
    if (counts.font > LIMITS.fonts) push(errors, 'assets', 'too many fonts');
    if (videoBytes > LIMITS.videoBytes)
      push(errors, 'assets', 'video total is too large');
  }

  if (project.fonts !== undefined) {
    if (!isObject(project.fonts)) {
      push(errors, 'fonts', 'must be an object');
    } else {
      const names = new Set();
      const entries = Object.entries(project.fonts);
      if (entries.length > LIMITS.fonts) {
        push(errors, 'fonts', `at most ${LIMITS.fonts} custom fonts`);
      }
      for (const [id, font] of entries) {
        if (font.id !== id) push(errors, `fonts.${id}.id`, 'must match its key');
        if (typeof font.name !== 'string' || !font.name.trim()) {
          push(errors, `fonts.${id}.name`, 'required');
        } else if (names.has(font.name.toLowerCase())) {
          push(errors, `fonts.${id}.name`, 'must be unique');
        } else {
          names.add(font.name.toLowerCase());
        }
        if (font.assetId && project.assets?.[font.assetId]?.kind !== 'font') {
          push(errors, `fonts.${id}.assetId`, 'must reference a font asset');
        }
        if (!['truetype', 'opentype', 'woff', 'woff2'].includes(font.format)) {
          push(errors, `fonts.${id}.format`, 'unknown font format');
        }
      }
    }
  }

  if (!Array.isArray(project.pages) || project.pages.length === 0) {
    push(errors, 'pages', 'requires at least one page');
  } else {
    if (project.pages.length > 200) push(errors, 'pages', 'too many pages');
    const ids = new Set();
    const slugs = new Set();
    project.pages.forEach((page, index) => {
      checkPage(page, index, project, errors);
      if (ids.has(page.id)) push(errors, `pages[${index}].id`, 'duplicate page id');
      ids.add(page.id);
      if (slugs.has(page.slug)) push(errors, `pages[${index}].slug`, 'duplicate slug');
      slugs.add(page.slug);
    });
    if (!ids.has(project.startPageId)) {
      push(errors, 'startPageId', 'must reference an existing page');
    }
  }

  if (project.fichaSchema !== undefined) {
    if (!isObject(project.fichaSchema) || !Array.isArray(project.fichaSchema.fields)) {
      push(errors, 'fichaSchema', 'must contain a fields array');
    } else {
      const fields = project.fichaSchema.fields;
      if (fields.length > FICHA_LIMITS.fields) {
        push(errors, 'fichaSchema.fields', 'too many fields');
      }
      const ids = new Set();
      const keys = new Set();
      fields.forEach((field, index) => {
        const path = `fichaSchema.fields[${index}]`;
        if (!isObject(field)) {
          push(errors, path, 'must be an object');
          return;
        }
        for (const message of fichaFieldErrors(field)) push(errors, path, message);
        if (ids.has(field.id)) push(errors, `${path}.id`, 'duplicate field id');
        ids.add(field.id);
        if (keys.has(field.key)) push(errors, `${path}.key`, 'duplicate field key');
        keys.add(field.key);
        if (typeof field.required !== 'boolean') {
          push(errors, `${path}.required`, 'must be a boolean');
        }
      });
    }
  }

  if (project.fichaSettings !== undefined) {
    if (
      !isObject(project.fichaSettings) ||
      typeof project.fichaSettings.movable !== 'boolean' ||
      (project.fichaSettings.showCode !== undefined &&
        typeof project.fichaSettings.showCode !== 'boolean')
    ) {
      push(errors, 'fichaSettings', 'movable and showCode must be booleans');
    }
  }

  if (project.fichas !== undefined) {
    if (!isObject(project.fichas)) {
      push(errors, 'fichas', 'must be an object');
    } else {
      const records = Object.entries(project.fichas);
      if (records.length > FICHA_LIMITS.records) {
        push(errors, 'fichas', 'too many fichas');
      }
      const codes = new Set();
      const fields = project.fichaSchema?.fields ?? [];
      for (const [id, record] of records) {
        const path = `fichas.${id}`;
        if (!isObject(record)) {
          push(errors, path, 'must be an object');
          continue;
        }
        if (record.id !== id) push(errors, `${path}.id`, 'must match its key');
        if (typeof record.code !== 'string' || !record.code.trim()) {
          push(errors, `${path}.code`, 'required');
        } else {
          const code = record.code.trim().toLowerCase();
          if (codes.has(code)) push(errors, `${path}.code`, 'must be unique');
          codes.add(code);
        }
        if (typeof record.label !== 'string' || !record.label.trim()) {
          push(errors, `${path}.label`, 'required');
        }
        if (record.assetId) {
          const asset = project.assets?.[record.assetId];
          if (!asset || asset.kind !== 'image') {
            push(errors, `${path}.assetId`, 'must reference an image asset');
          }
        }
        if (typeof record.alt !== 'string') {
          push(errors, `${path}.alt`, 'must be a string');
        }
        if (!isObject(record.values)) {
          push(errors, `${path}.values`, 'must be an object');
          continue;
        }
        for (const field of fields) {
          const value = record.values[field.id];
          if (value !== undefined && typeof value !== 'string') {
            push(errors, `${path}.values.${field.id}`, 'must be a string');
            continue;
          }
          const text = String(value ?? '').trim();
          if (field.required && !text) {
            push(errors, `${path}.values.${field.id}`, 'required');
          }
          if (field.type === 'url' && text && !isSafeFichaUrl(text)) {
            push(errors, `${path}.values.${field.id}`, 'must be an http(s) URL');
          }
          if (text.length > FICHA_LIMITS.textLength) {
            push(errors, `${path}.values.${field.id}`, 'is too long');
          }
        }
      }
    }
  }

  if (project.redirects !== undefined) {
    if (!Array.isArray(project.redirects)) {
      push(errors, 'redirects', 'must be an array');
    } else {
      if (project.redirects.length > LIMITS.redirects) {
        push(errors, 'redirects', `at most ${LIMITS.redirects} redirects`);
      }
      const froms = new Set();
      const liveSlugs = new Set((project.pages ?? []).map((page) => page.slug));
      const pageIds = new Set((project.pages ?? []).map((page) => page.id));
      project.redirects.forEach((redirect, index) => {
        const path = `redirects[${index}]`;
        if (!isValidSlug(redirect.from)) push(errors, `${path}.from`, 'invalid slug');
        if (liveSlugs.has(redirect.from))
          push(errors, `${path}.from`, 'collides with a live page');
        if (!pageIds.has(redirect.toPageId))
          push(errors, `${path}.toPageId`, 'page does not exist');
        if (froms.has(redirect.from)) push(errors, `${path}.from`, 'duplicate redirect');
        froms.add(redirect.from);
      });
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Migrations are pure functions. v1 is the first version; an unknown future
 * version is rejected rather than guessed.
 *
 * @param {object} raw
 * @returns {{ok: boolean, project?: object, errors: Array<{path: string, message: string}>}}
 */
export function migrateProject(raw) {
  if (!isObject(raw)) {
    return { ok: false, errors: [{ path: '', message: 'project must be an object' }] };
  }
  if (raw.format !== PROJECT_FORMAT) {
    return {
      ok: false,
      errors: [{ path: 'format', message: `must be ${PROJECT_FORMAT}` }]
    };
  }
  if (raw.version === PROJECT_VERSION) {
    return {
      ok: true,
      project: {
        ...raw,
        fichaSchema: isObject(raw.fichaSchema) ? raw.fichaSchema : { fields: [] },
        fichaSettings: {
          movable: false,
          showCode: true,
          ...(isObject(raw.fichaSettings) ? raw.fichaSettings : {})
        },
        fichas: isObject(raw.fichas) ? raw.fichas : {}
      }
    };
  }
  if (!Number.isInteger(raw.version)) {
    return { ok: false, errors: [{ path: 'version', message: 'required' }] };
  }
  return {
    ok: false,
    errors: [
      {
        path: 'version',
        message: `unsupported version ${raw.version}; this editor supports ${PROJECT_VERSION}`
      }
    ]
  };
}

/**
 * @param {object} raw
 * @returns {{ok: boolean, project?: object, errors: Array<{path: string, message: string}>}}
 */
export function parseProject(raw) {
  const migrated = migrateProject(raw);
  if (!migrated.ok) return migrated;
  const validation = validateProject(migrated.project);
  if (!validation.ok) return validation;
  return { ok: true, project: migrated.project, errors: [] };
}

export function isReservedProjectSlug(slug) {
  return isReservedSlug(slug);
}

export function stagePresetId(stage) {
  return (
    STAGE_PRESETS.find(
      (preset) => preset.width === stage.width && preset.height === stage.height
    )?.id ?? 'wide'
  );
}

export function touchProject(project, clock = () => new Date()) {
  project.updatedAt = clock().toISOString();
  return project;
}
