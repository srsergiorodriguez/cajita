import { elementToCss, pxToCqw } from '../domain/geometry.js';
import { BUILTIN_FONTS } from '../domain/elements.js';
import { fontFamily } from '../domain/fonts.js';
import { assetFileName } from '../domain/assets.js';
import { META_FIELDS } from '../domain/links.js';
import { canonicalBase, canonicalPageUrl } from '../domain/publish/domain.js';
import { embedProvider, embedSrc } from '../domain/embeds.js';
import { shapeSvg } from '../domain/shapes.js';
import { maskClipPath } from '../domain/mask.js';
import { fichaCardRows, isSafeFichaUrl } from '../domain/fichas.js';
import { FICHA_MOVE_SCRIPT } from './ficha-move.js';
import { AUDIO_PLAYER_SCRIPT } from './audio-player.js';

const BUILTIN_FAMILIES = Object.fromEntries(
  BUILTIN_FONTS.map((font) => [font.id, `'${font.family}', ${font.fallback ?? 'Georgia, serif'}`])
);

const TRANSITION_RUNTIME = `(function(){var k='cajita:transition';function mode(){return document.documentElement.getAttribute('data-transition')||'cut';}window.addEventListener('pageswap',function(){try{sessionStorage.setItem(k,mode());}catch(e){}});window.addEventListener('pagereveal',function(e){var m='';try{m=sessionStorage.getItem(k)||'';sessionStorage.removeItem(k);}catch(err){}if(m==='fade'||m==='slide'){try{if(e.viewTransition&&e.viewTransition.types)e.viewTransition.types.add(m);}catch(err){}}});})();`;

const META_LABELS = {
  es: {
    title: 'Título',
    creator: 'Autor',
    date: 'Fecha',
    medium: 'Medio',
    rights: 'Derechos',
    source: 'Fuente',
    description: 'Descripción'
  },
  en: {
    title: 'Title',
    creator: 'Creator',
    date: 'Date',
    medium: 'Medium',
    rights: 'Rights',
    source: 'Source',
    description: 'Description'
  }
};

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function rootPrefix(project, page) {
  return page?.id === project.startPageId ? '' : '../';
}

export function pagePath(project, page) {
  return page.id === project.startPageId ? 'index.html' : `${page.slug}/index.html`;
}

export function pageHref(project, fromPage, toPage) {
  if (!toPage) return '';
  const prefix = rootPrefix(project, fromPage);
  return toPage.id === project.startPageId
    ? `${prefix}index.html`
    : `${prefix}${toPage.slug}/`;
}

export function assetHref(project, page, asset) {
  const prefix = rootPrefix(project, page);
  return `${prefix}assets/${assetFileName(asset.hash, asset.name, asset.mime)}`;
}

export function isSafeUrl(url) {
  return /^(https?:|mailto:|tel:)/i.test(String(url ?? ''));
}

export function siteCss(project, { fontFaces = [] } = {}) {
  const theme = project.theme ?? {};
  const stage = project.stage ?? {};
  const ratio = (stage.width || 1200) / (stage.height || 800);
  const fonts = fontFaces
    .map(
      (font) =>
        `@font-face{font-family:'${font.family}';src:url('${font.src}') format('${font.format || 'woff2'}');font-weight:${font.weight ?? 400};font-style:${font.style ?? 'normal'};font-display:swap;}`
    )
    .join('\n');

  return `${fonts}
:root{color-scheme:light;}
*,*::before,*::after{box-sizing:border-box;}
html,body{margin:0;min-height:100%;}
body{
  display:flex;
  flex-direction:column;
  align-items:center;
  min-height:100svh;
  background:${project.siteBackground ?? theme.background ?? '#f7f1e5'};
  color:${theme.ink ?? '#24303f'};
  font-family:${BUILTIN_FAMILIES['space-mono']};
  -webkit-font-smoothing:antialiased;
}
.stage{
  position:relative;
  width:min(100vw, ${stage.maxWidth ?? 1280}px);
  aspect-ratio:${stage.width ?? 1200} / ${stage.height ?? 800};
  overflow:hidden;
  background:${stage.background?.color ?? '#fffdf7'};
  container-type:size;
}
body.fit-width .stage{width:clamp(${stage.minWidth ?? 360}px, 100vw, ${stage.maxWidth ?? 1280}px);}
body.fit-width{justify-content:flex-start;}
body.align-left{align-items:flex-start;}
.el{
  position:absolute;
  left:var(--x);top:var(--y);
  width:var(--w);height:var(--h);
  z-index:var(--z);
  transform:rotate(var(--rot));
  opacity:var(--opacity,1);
  margin:0;
}
.el-link{color:inherit;text-decoration:none;}
.el-text{white-space:pre-wrap;overflow-wrap:anywhere;overflow:visible;}
.el-text h1,.el-text p,.el-text div{margin:0;font:inherit;white-space:pre-wrap;}
.el-image{overflow:hidden;}
.el-image img{display:block;width:100%;height:100%;object-fit:var(--fit,cover);}
.el-video{overflow:hidden;background:#000;}
.el-video video{display:block;width:100%;height:100%;object-fit:var(--fit,cover);}
.el-audio{display:block;padding:0;background:transparent;border:0;font-size:2cqw;}
.el-shape svg{display:block;width:100%;height:100%;overflow:visible;}
.el-embed{overflow:hidden;background:#fff;}
.el-embed--youtube{background:#000;}
.embed-frame{position:relative;width:100%;height:100%;background:transparent;}
.el-embed--youtube .embed-frame{background:#000;}
.embed-frame iframe{display:block;width:100%;height:100%;border:0;background:transparent;}
.embed-source{position:absolute;right:4px;bottom:4px;padding:2px 4px;background:rgba(0,0,0,.72);color:#fff;font-size:10px;line-height:1.2;text-decoration:none;}
.embed-source:hover{text-decoration:underline;}
.audio-inner{display:flex;align-items:center;gap:1.8cqw;width:100%;height:100%;padding:1.5cqw 2cqw;background:var(--panel,#fffdf7);border:1px solid currentColor;font-size:1.6cqw;}
.audio-inner audio{display:none;}
.audio-inner--label{padding:1.4cqw;}
.audio-play{flex:0 0 auto;display:grid;place-items:center;width:5cqw;height:5cqw;min-width:26px;min-height:26px;padding:0;border:0;background:currentColor;color:inherit;font:inherit;cursor:pointer;}
.audio-play span{color:var(--panel,#fffdf7);}
.audio-copy{display:flex;flex-direction:column;gap:.7cqw;min-width:0;flex:1;}
.audio-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.audio-line{display:flex;align-items:center;gap:1cqw;}
.audio-bar{position:relative;display:block;flex:1;height:2px;background:color-mix(in srgb,currentColor 22%,transparent);cursor:pointer;}
.audio-bar i{display:block;width:0;height:100%;background:currentColor;}
.audio-time{color:inherit;font-size:1.2cqw;opacity:.72;white-space:nowrap;}
.summary-el{display:block;width:100%;height:100%;}
.el-meta{overflow:visible;}
.el-meta > summary{display:block;width:100%;height:100%;list-style:none;cursor:pointer;}
.el-meta > summary::-webkit-details-marker{display:none;}
.el-meta > summary img{display:block;width:100%;height:100%;object-fit:cover;}
.el-ficha{overflow:visible;}
.el-ficha.is-movable>summary{cursor:grab;touch-action:none;user-select:none;}
.el-ficha.is-movable>summary:active{cursor:grabbing;}
.el-ficha.is-movable>summary img{pointer-events:none;user-drag:none;-webkit-user-drag:none;}
.el-ficha>summary{display:block;width:100%;height:100%;list-style:none;cursor:pointer;}
.el-ficha>summary::-webkit-details-marker{display:none;}
.el-ficha>summary img{display:block;width:100%;height:100%;object-fit:cover;}
.ficha-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;height:100%;padding:12px;background:#fffdf7;border:2px solid currentColor;text-align:center;}
.ficha-empty span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;opacity:.65;}
.ficha-empty strong{font-family:'Fraunces',Georgia,serif;font-size:20px;line-height:1.05;}
.ficha-code{margin:0 0 10px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.65;}
.meta-card{
  position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%) rotate(-1deg);
  width:min(360px, 80vw);padding:18px;background:#fffdf7;color:#24303f;
  border:2px solid #24303f;box-shadow:0 18px 42px rgba(0,0,0,.2);z-index:1000;
}
.meta-card h2{margin:0 0 8px;font-family:'Fraunces',Georgia,serif;font-size:24px;line-height:1.05;}
.meta-card dl{display:grid;grid-template-columns:80px 1fr;gap:4px 10px;margin:0;}
.meta-card dt{font-size:10px;text-transform:uppercase;letter-spacing:.08em;opacity:.65;}
.meta-card dd{margin:0;font-size:12px;line-height:1.4;overflow-wrap:anywhere;}
.ficha-reset{position:absolute;right:10px;bottom:10px;z-index:1002;padding:3px 7px;border:1px solid currentColor;background:rgba(255,253,247,.86);color:#24303f;font:11px/1.2 'Space Mono',monospace;letter-spacing:.04em;text-transform:lowercase;cursor:pointer;}
.ficha-reset:hover{background:#fffdf7;}
.ficha-card{left:50%;top:50%;width:min(360px,calc(100% - 16px));transform:translate(-50%,-50%) rotate(-1deg);max-height:calc(100% - 16px);overflow:auto;z-index:1001;}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
a:focus-visible,summary:focus-visible,video:focus-visible,audio:focus-visible{outline:3px solid ${theme.accent ?? '#2e5a88'};outline-offset:3px;}
@media (prefers-reduced-motion: reduce){*{scroll-behavior:auto!important;}}
@media (max-width: 700px){body.fit-contain .stage{width:100vw;height:auto;}}
@view-transition{navigation:auto;}
::view-transition-old(root),::view-transition-new(root){animation:none;}
html:active-view-transition-type(fade)::view-transition-old(root){animation:cajita-fade-out 1000ms ease both;}
html:active-view-transition-type(fade)::view-transition-new(root){animation:cajita-fade-in 1000ms ease both;}
html:active-view-transition-type(slide)::view-transition-old(root){animation:cajita-slide-out 1000ms ease both;}
html:active-view-transition-type(slide)::view-transition-new(root){animation:cajita-slide-in 1000ms ease both;}
@keyframes cajita-fade-out{to{opacity:0;}}
@keyframes cajita-fade-in{from{opacity:0;}}
@keyframes cajita-slide-out{to{transform:translateX(-100%);}}
@keyframes cajita-slide-in{from{transform:translateX(100%);}}
@media (prefers-reduced-motion: reduce){::view-transition-old(root),::view-transition-new(root){animation:none!important;}}
`;
}

function styleFor(element, stage) {
  const css = elementToCss(element, stage);
  return Object.entries(css)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}

function textStyle(element, project, stage) {
  const family = project.fonts?.[element.font]
    ? `'${fontFamily(project.fonts[element.font])}', Georgia, serif`
    : (BUILTIN_FAMILIES[element.font] ?? BUILTIN_FAMILIES.fraunces);
  return [
    styleFor(element, stage),
    `font-family:${family}`,
    `font-size:${pxToCqw(element.fontSize, stage.width)}`,
    `line-height:${element.lineHeight}`,
    `letter-spacing:${pxToCqw(element.letterSpacing, stage.width)}`,
    `color:${element.color}`,
    `text-align:${element.align}`,
    `background:${element.background || 'transparent'}`,
    `padding:${pxToCqw(element.padding || 0, stage.width)}`,
    `font-weight:${element.heading ? 700 : 400}`
  ].join(';');
}

function metaCardHtml(element, project) {
  const fields = META_FIELDS.filter((field) => element.meta?.[field]?.trim());
  if (fields.length === 0) return '';
  return `<div class="meta-card"><dl>${fields
    .map(
      (field) =>
        `<dt>${escapeHtml(META_LABELS[project.locale]?.[field] ?? field)}</dt><dd>${escapeHtml(element.meta[field])}</dd>`
    )
    .join('')}</dl></div>`;
}

function linkFor(project, page, element, options) {
  const link = element.link;
  if (!link || link.kind === 'meta') return null;
  if (link.kind === 'page') {
    const target = project.pages.find((item) => item.id === link.pageId);
    return target
      ? { href: options.pageHref(project, page, target), pageId: target.id }
      : null;
  }
  if (link.kind === 'url' && isSafeUrl(link.url)) {
    return { href: link.url, newTab: Boolean(link.newTab) };
  }
  return null;
}

function contentFor(element, project, stage, options, page) {
  if (element.type === 'image') {
    const asset = project.assets?.[element.assetId];
    if (!asset) return '';
    const mask = maskClipPath(element.mask);
    return `<img src="${escapeHtml(options.assetHref(project, page, asset))}" alt="${escapeHtml(element.alt)}" loading="lazy" style="object-fit:${mask || element.fit === 'contain' ? 'contain' : 'cover'};${element.pixelated ? 'image-rendering:pixelated;' : ''}${mask ? `clip-path:${mask};` : ''}" />`;
  }
  if (element.type === 'video') {
    const asset = project.assets?.[element.assetId];
    if (!asset) return '';
    const controls = element.controls === false ? '' : ' controls';
    return `<video src="${escapeHtml(options.assetHref(project, page, asset))}"${controls}${element.autoplay ? ' autoplay' : ''}${element.loop ? ' loop' : ''}${element.muted ? ' muted' : ''} playsinline preload="metadata" style="object-fit:${element.fit === 'contain' ? 'contain' : 'cover'}"></video>`;
  }
  if (element.type === 'audio') {
    const asset = project.assets?.[element.assetId];
    if (!asset) return '';
    const src = escapeHtml(options.assetHref(project, page, asset));
    const label = escapeHtml(element.label || asset.name);
    if (element.controls === false) {
      return `<div class="audio-inner audio-inner--label"><span class="audio-label">${label}</span></div>`;
    }
    return `<div class="audio-inner"><button class="audio-play" type="button" data-audio-toggle aria-label="${project.locale === 'en' ? 'play audio' : 'reproducir audio'}"><span data-audio-icon>▶</span></button><div class="audio-copy"><span class="audio-label">${label}</span><div class="audio-line"><span class="audio-bar" data-audio-bar><i></i></span><span class="audio-time" data-audio-time>0:00</span></div></div><audio src="${src}"${element.autoplay ? ' autoplay' : ''}${element.loop ? ' loop' : ''} preload="metadata"></audio><noscript><audio src="${src}" controls preload="metadata"></audio></noscript></div>`;
  }
  if (element.type === 'shape') {
    return shapeSvg(element);
  }
  if (element.type === 'embed') {
    const src = embedSrc(element);
    const provider = embedProvider(element.provider);
    if (!src || !provider) return '';
    const label = element.title || provider.label;
    return `<div class="embed-frame"><iframe src="${escapeHtml(src)}" title="${escapeHtml(element.caption ? `${label}: ${element.caption}` : label)}" loading="lazy" referrerpolicy="${element.provider === 'youtube' || element.provider === 'p5' ? 'strict-origin-when-cross-origin' : 'no-referrer'}" sandbox="${provider.sandbox}"${provider.allow ? ` allow="${provider.allow}"` : ''}${element.provider === 'youtube' ? ' allowfullscreen' : ''}></iframe><a class="embed-source" href="${escapeHtml(element.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(provider.label)} ↗</a></div>`;
  }
  const tag = element.heading ? 'h1' : 'p';
  return `<${tag}>${escapeHtml(element.text)}</${tag}>`;
}

function renderElement(element, project, page, options) {
  const stage = project.stage;
  if (element.type === 'embed') {
    return `<div class="el el-embed el-embed--${element.provider}" style="${styleFor(element, stage)}">${contentFor(element, project, stage, options, page)}</div>`;
  }

  if (element.type === 'ficha') {
    const record = project.fichas?.[element.fichaId];
    if (!record) return '';
    const asset = project.assets?.[record.assetId];
    const image = asset
      ? `<img src="${escapeHtml(options.assetHref(project, page, asset))}" alt="${escapeHtml(record.alt || record.label)}" loading="lazy" />`
      : `<div class="ficha-empty"><span>ficha</span><strong>${escapeHtml(record.label)}</strong></div>`;
    const rows = fichaCardRows(project, record)
      .map(({ field, label, value }) => {
        const content =
          field.type === 'url' && isSafeFichaUrl(value)
            ? `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a>`
            : escapeHtml(value);
        return `<dt>${escapeHtml(label)}</dt><dd>${content}</dd>`;
      })
      .join('');
    return `<details class="el el-ficha" style="${styleFor(element, stage)}" data-ficha-id="${escapeHtml(record.id)}" data-ficha-element="${escapeHtml(element.id)}"><summary>${image}</summary><div class="meta-card ficha-card"><h2>${escapeHtml(record.label)}</h2>${project.fichaSettings?.showCode !== false ? `<p class="ficha-code">${escapeHtml(record.code)}</p>` : ''}${rows ? `<dl>${rows}</dl>` : ''}</div></details>`;
  }

  const href = linkFor(project, page, element, options);
  const style =
    element.type === 'text'
      ? textStyle(element, project, stage)
      : styleFor(element, stage);
  const content = contentFor(element, project, stage, options, page);

  if (element.link?.kind === 'meta') {
    return `<details class="el el-${element.type} el-meta" style="${style}"><summary>${content}</summary>${metaCardHtml(element, project)}</details>`;
  }
  if (href) {
    const previewPage = options.preview && href.pageId;
    const url = previewPage ? '#' : href.href;
    const data = previewPage ? ` data-cajita-page="${escapeHtml(href.pageId)}"` : '';
    const target = href.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a class="el el-${element.type} el-link" href="${escapeHtml(url)}"${data}${target} style="${style}">${content}</a>`;
  }
  return `<div class="el el-${element.type}" style="${style}">${content}</div>`;
}

export function buildPageHtml(project, page, options = {}) {
  const stage = project.stage;
  const base = canonicalBase(project);
  const canonical = canonicalPageUrl(base, page, project.startPageId);
  const pageBackground = page.background?.color ?? stage.background?.color ?? '#fffdf7';
  const opts = {
    pageHref,
    assetHref,
    preview: false,
    cssHref: (project, page) => `${rootPrefix(project, page)}cajita.css`,
    jsHref: (project, page) => `${rootPrefix(project, page)}cajita.js`,
    ...options
  };
  const hasHeading = (page.elements ?? []).some(
    (element) => element.type === 'text' && element.heading
  );
  const heading = hasHeading ? '' : `<h1 class="sr-only">${escapeHtml(page.title)}</h1>`;
  const elements = (page.elements ?? [])
    .slice()
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    .filter((element) => !element.hidden)
    .map((element) => renderElement(element, project, page, opts))
    .join('');

  const cssTag = opts.inlineCss
    ? `<style>${opts.inlineCss}</style>`
    : `<link rel="stylesheet" href="${escapeHtml(opts.cssHref(project, page))}" />`;
  const jsTag =
    opts.inlineScript !== undefined
      ? `<script>${opts.inlineScript}</script>`
      : `<script src="${escapeHtml(opts.jsHref(project, page))}" defer></script>`;
  const description = project.meta?.description
    ? `<meta name="description" content="${escapeHtml(project.meta.description)}" />`
    : '';
  const canonicalTags = canonical
    ? `<link rel="canonical" href="${escapeHtml(canonical)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeHtml(page.title)}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />${
        project.meta?.description
          ? `
<meta property="og:description" content="${escapeHtml(project.meta.description)}" />`
          : ''
      }`
    : '';

  return `<!doctype html>
<html lang="${escapeHtml(project.locale)}" data-transition="${escapeHtml(page.transition ?? 'cut')}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(page.title === 'Inicio' ? project.title : `${page.title} — ${project.title}`)}</title>
${description}
${canonicalTags}
<script>${TRANSITION_RUNTIME}</script>
${cssTag}
${jsTag}
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><rect width=%2232%22 height=%2232%22 fill=%22${encodeURIComponent(project.theme?.accent ?? '#2e5a88')}%22/></svg>" />
</head>
<body class="fit-${escapeHtml(project.stage.fit)} align-${escapeHtml(project.stage.align)}"${project.fichaSettings?.movable ? ` data-ficha-movable="true" data-ficha-project="${escapeHtml(project.id)}" data-ficha-page="${escapeHtml(page.id)}"` : ''} style="background:${escapeHtml(pageBackground)}">
<main class="stage" style="--stage-w:${stage.width};--stage-h:${stage.height};background:${escapeHtml(pageBackground)}">
${heading}${elements}${project.fichaSettings?.movable && elements.includes('el-ficha') ? `<button class="ficha-reset" type="button" data-ficha-reset>${escapeHtml(project.locale === 'en' ? 'reset fichas' : 'reiniciar fichas')}</button>` : ''}
</main>
</body>
</html>`;
}

export function buildRedirectHtml(project, redirect) {
  const target = project.pages.find((page) => page.id === redirect.toPageId);
  if (!target) return '';
  const href = target.id === project.startPageId ? '../index.html' : `../${target.slug}/`;
  return `<!doctype html><html lang="${escapeHtml(project.locale)}" data-transition="${escapeHtml(target.transition ?? 'cut')}"><head><meta charset="utf-8"><title>Redirigiendo…</title><meta http-equiv="refresh" content="0;url=${escapeHtml(href)}"><link rel="canonical" href="${escapeHtml(href)}"></head><body><p><a href="${escapeHtml(href)}">Continuar</a></p></body></html>`;
}

export function sitemapXml(project) {
  const base = canonicalBase(project);
  if (!base) return '';
  const urls = project.pages
    .map((page) => canonicalPageUrl(base, page, project.startPageId))
    .map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(project) {
  const base = canonicalBase(project);
  return `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}sitemap.xml\n` : ''}`;
}

export function buildSite(project, options = {}) {
  const opts = {
    assetHref,
    pageHref,
    ...options
  };
  const css = siteCss(project, { fontFaces: options.fontFaces ?? [] });
  const pages = project.pages.map((page) => ({
    page,
    path: pagePath(project, page),
    html: buildPageHtml(project, page, {
      ...opts,
      inlineCss: options.inlineCss ? css : undefined
    })
  }));
  const redirects = (project.redirects ?? []).map((redirect) => ({
    redirect,
    path: `${redirect.from}/index.html`,
    html: buildRedirectHtml(project, redirect)
  }));
  const assets = usedAssets(project);
  const base = canonicalBase(project);
  const customDomain = project.publish?.customDomain;
  const files = [
    ...pages.map((page) => ({
      path: page.path,
      content: page.html,
      mime: 'text/html'
    })),
    ...redirects.map((item) => ({
      path: item.path,
      content: item.html,
      mime: 'text/html'
    })),
    { path: 'cajita.css', content: css, mime: 'text/css' },
    {
      path: 'cajita.js',
      content: `${AUDIO_PLAYER_SCRIPT}\n${project.fichaSettings?.movable ? `${FICHA_MOVE_SCRIPT}\n` : ''}`,
      mime: 'text/javascript'
    },
    { path: 'robots.txt', content: robotsTxt(project), mime: 'text/plain' },
    { path: '.nojekyll', content: '', mime: 'text/plain' },
    {
      path: '404.html',
      content: `<meta charset="utf-8"><title>No encontrado</title><p><a href="./">Volver al inicio</a></p>`,
      mime: 'text/html'
    }
  ];
  if (base) {
    files.push({
      path: 'sitemap.xml',
      content: sitemapXml(project),
      mime: 'application/xml'
    });
  }
  if (customDomain) {
    files.push({ path: 'CNAME', content: `${customDomain}\n`, mime: 'text/plain' });
  }
  return { css, pages, redirects, assets, files };
}

export function usedAssets(project) {
  const ids = new Set();
  for (const page of project.pages ?? []) {
    for (const element of page.elements ?? []) {
      if (element.assetId) ids.add(element.assetId);
      if (element.type === 'ficha') {
        const assetId = project.fichas?.[element.fichaId]?.assetId;
        if (assetId) ids.add(assetId);
      }
    }
  }
  const usedFontIds = new Set();
  for (const page of project.pages ?? []) {
    for (const element of page.elements ?? []) {
      if (element.type === 'text' && project.fonts?.[element.font]) {
        usedFontIds.add(element.font);
      }
    }
  }
  for (const font of Object.values(project.fonts ?? {})) {
    if (font.assetId && usedFontIds.has(font.id)) ids.add(font.assetId);
  }
  return [...ids]
    .map((id) => project.assets?.[id])
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function usedBuiltinFontIds(project) {
  const ids = new Set();
  for (const page of project.pages ?? []) {
    for (const element of page.elements ?? []) {
      if (element.type === 'text' && BUILTIN_FAMILIES[element.font])
        ids.add(element.font);
    }
  }
  return [...ids];
}
