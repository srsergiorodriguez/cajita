import {
  compositionChildStyle,
  interactiveFrameId,
  normaliseComposition
} from '../domain/composition.js';
import { shapeSvg } from '../domain/shapes.js';
import { fontFamily } from '../domain/fonts.js';
import { BUILTIN_FONTS } from '../domain/elements.js';
import { maskClipPath } from '../domain/mask.js';

const BUILTIN_FAMILIES = Object.fromEntries(
  BUILTIN_FONTS.map((font) => [font.id, `'${font.family}', ${font.fallback ?? 'Georgia, serif'}`])
);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function family(project, fontId) {
  if (BUILTIN_FAMILIES[fontId]) return BUILTIN_FAMILIES[fontId];
  const custom = project.fonts?.[fontId];
  return custom ? `'${fontFamily(custom)}', Georgia, serif` : BUILTIN_FAMILIES.fraunces;
}

function childHtml(child, project, page, options, aspect) {
  if (child.type === 'shape') {
    return shapeSvg(child, (Number(aspect) || 1) * (child.frame.w / child.frame.h));
  }
  if (child.type === 'image' || child.type === 'drawing') {
    const asset = project.assets?.[child.assetId];
    if (!asset) return '';
    const mask = child.mask ? maskClipPath(child.mask, child.maskCurve) : '';
    return `<img src="${escapeHtml(options.assetHref(project, page, asset))}" alt="${escapeHtml(child.alt || '')}" loading="lazy" style="display:block;width:100%;height:100%;object-fit:${child.fit === 'contain' ? 'contain' : 'cover'};${child.pixelated ? 'image-rendering:pixelated;' : ''}${mask ? `clip-path:${mask};` : ''}" />`;
  }
  const tag = child.heading ? 'strong' : 'span';
  return `<${tag} class="composition-text" style="font-family:${family(project, child.font)};font-size:${child.fontSize}cqw;line-height:${child.lineHeight};letter-spacing:${child.letterSpacing}cqw;padding:${child.padding}cqw;color:${child.color};background:${child.background || 'transparent'};text-align:${child.align};justify-content:${child.align === 'center' ? 'center' : child.align === 'right' ? 'flex-end' : 'flex-start'};font-weight:${child.heading ? 700 : 400};">${escapeHtml(child.text)}</${tag}>`;
}

export function compositionHtml(project, page, element, options) {
  const composition = normaliseComposition(element.composition);
  const aspect = element.frame.w / element.frame.h;
  const first = composition.frames[0];
  const roles = new Map();
  const addRole = (frameId, role) => {
    const current = roles.get(frameId) ?? [];
    roles.set(frameId, [...current, role]);
  };
  if (composition.preset === 'button') {
    addRole(first.id, 'is-idle');
    addRole(interactiveFrameId(composition, 'hover'), 'is-hover');
    addRole(interactiveFrameId(composition, 'pressed'), 'is-pressed');
  }
  const frames = composition.frames.map((frame, index) => {
    const classes = [
      'composition-frame',
      index === 0 ? 'is-first' : '',
      composition.preset === 'animation' && index === 0 ? 'is-active' : '',
      ...(roles.get(frame.id) ?? [])
    ].filter(Boolean).join(' ');
    const children = frame.children
      .filter((child) => !child.hidden)
      .map(
        (child) =>
          `<div class="composition-child" style="${compositionChildStyle(child)}">${childHtml(child, project, page, options, aspect)}</div>`
      )
      .join('');
    return `<div class="${classes}" data-frame-id="${escapeHtml(frame.id)}" data-duration="${frame.duration}">${children}</div>`;
  }).join('');

  if (composition.preset === 'animation') {
    return `<div class="composition-shell composition--animation" data-composition-animation data-autoplay="${composition.timeline.autoplay ? '1' : '0'}" data-loop="${composition.timeline.loop ? '1' : '0'}">${frames}</div>`;
  }
  return `<div class="composition-shell composition--button">${frames}</div>`;
}
