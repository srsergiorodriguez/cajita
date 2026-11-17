import { buttonChildStyle, buttonState, normaliseButton } from '../domain/button.js';
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

function childHtml(child, project, page, options) {
  if (child.type === 'shape') {
    return shapeSvg(child);
  }
  if (child.type === 'image' || child.type === 'drawing') {
    const asset = project.assets?.[child.assetId];
    if (!asset) return '';
    const mask = child.mask ? maskClipPath(child.mask, child.maskCurve) : '';
    return `<img src="${escapeHtml(options.assetHref(project, page, asset))}" alt="${escapeHtml(child.alt || '')}" loading="lazy" style="display:block;width:100%;height:100%;object-fit:${child.fit === 'contain' ? 'contain' : 'cover'};${child.pixelated ? 'image-rendering:pixelated;' : ''}${mask ? `clip-path:${mask};` : ''}" />`;
  }
  const tag = child.heading ? 'strong' : 'span';
  return `<${tag} class="button-text" style="font-family:${family(project, child.font)};font-size:${child.fontSize}cqw;line-height:${child.lineHeight};letter-spacing:${child.letterSpacing}cqw;padding:${child.padding}cqw;color:${child.color};background:${child.background || 'transparent'};text-align:${child.align};justify-content:${child.align === 'center' ? 'center' : child.align === 'right' ? 'flex-end' : 'flex-start'};font-weight:${child.heading ? 700 : 400};">${escapeHtml(child.text)}</${tag}>`;
}

function stateHtml(children, project, page, options, stateName) {
  return `<div class="button-state button-state--${stateName}">${(children ?? []).map((child) => `<div class="button-child" style="${buttonChildStyle(child)}">${childHtml(child, project, page, options)}</div>`).join('')}</div>`;
}

export function buttonHtml(project, page, element, options) {
  const button = normaliseButton(element.button);
  const idle = buttonState(button, 'idle');
  const hover = buttonState(button, 'hover');
  const pressed = buttonState(button, 'pressed');
  return `<div class="button-shell">
    ${stateHtml(idle, project, page, options, 'idle')}
    ${stateHtml(hover, project, page, options, 'hover')}
    ${stateHtml(pressed, project, page, options, 'pressed')}
  </div>`;
}
