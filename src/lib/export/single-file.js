import { buildSite } from './site.js';
import { AUDIO_PLAYER_SCRIPT } from './audio-player.js';
import { FICHA_MOVE_SCRIPT } from './ficha-move.js';

function escapeAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractMain(html) {
  return /<main\b[^>]*>[\s\S]*?<\/main>/i.exec(html)?.[0] ?? '';
}

function routerScript() {
  return `(function(){
  var sections=Array.prototype.slice.call(document.querySelectorAll('.sf-page'));
  var bySlug={},byId={};
  sections.forEach(function(section){
    bySlug[section.getAttribute('data-page-slug')]=section;
    byId[section.getAttribute('data-page-id')]=section;
  });
  function animate(section){
    var mode=section.getAttribute('data-transition')||'cut';
    if(mode!=='fade'&&mode!=='slide')return;
    section.classList.remove('sf-transition-fade','sf-transition-slide');
    void section.offsetWidth;
    section.classList.add('sf-transition-'+mode);
    setTimeout(function(){section.classList.remove('sf-transition-'+mode);},1100);
  }
  function show(section,push){
    if(!section)return;
    sections.forEach(function(item){item.classList.toggle('is-active',item===section);});
    document.title=section.getAttribute('data-page-title')||document.title;
    if(push){
      animate(section);
      var next='#/'+section.getAttribute('data-page-slug');
      if(location.hash!==next)history.pushState(null,'',next);
    }
    var stage=section.querySelector('.stage');
    if(stage&&stage.__cajitaFichasRefresh)stage.__cajitaFichasRefresh();
    window.scrollTo(0,0);
  }
  function fromHash(){
    var slug=decodeURIComponent((location.hash||'').replace(/^#\\/?/,''));
    return bySlug[slug]||sections[0];
  }
  document.addEventListener('click',function(event){
    var link=event.target.closest('a[data-cajita-page]');
    if(!link)return;
    event.preventDefault();
    show(byId[link.getAttribute('data-cajita-page')],true);
  });
  window.addEventListener('popstate',function(){show(fromHash(),false);});
  window.addEventListener('hashchange',function(){show(fromHash(),false);});
  show(fromHash(),false);
})();`;
}

/**
 * Build a portable single HTML file. Internal page links use the same
 * data-cajita-page attributes as preview; a tiny hash router shows one section.
 * Movable visitor behavior is intentionally disabled in the portable file.
 */
export function buildSingleFile(project, { assetHref, builtinHref, customHref, fontFaces }) {
  const clean = structuredClone(project);
  const site = buildSite(clean, {
    assetHref,
    builtinHref,
    customHref,
    fontFaces,
    preview: true,
    inlineCss: true,
    inlineScript: ''
  });
  const sections = site.pages
    .map(({ page, html }, index) => {
      const main = extractMain(html);
      const active = page.id === clean.startPageId || (!clean.startPageId && index === 0);
      return `<section class="sf-page${active ? ' is-active' : ''}" data-page-id="${escapeAttribute(page.id)}" data-page-slug="${escapeAttribute(page.slug)}" data-page-title="${escapeAttribute(`${page.title} — ${clean.title}`)}" data-transition="${escapeAttribute(page.transition ?? 'cut')}" data-ficha-project="${escapeAttribute(clean.id)}" data-ficha-page="${escapeAttribute(page.id)}">${main}</section>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="${escapeAttribute(clean.locale)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeAttribute(clean.title)}</title>
<style>${site.css}
.sf-page{display:none;}
.sf-page.is-active{display:block;}
.sf-page.sf-transition-fade{animation:sf-fade 1000ms ease both;}
.sf-page.sf-transition-slide{animation:sf-slide 1000ms ease both;}
@keyframes sf-fade{from{opacity:0;}to{opacity:1;}}
@keyframes sf-slide{from{opacity:0;transform:translateX(28px);}to{opacity:1;transform:none;}}
@media (prefers-reduced-motion:reduce){.sf-page.sf-transition-fade,.sf-page.sf-transition-slide{animation:none;}}
</style>
</head>
<body class="fit-${escapeAttribute(clean.stage.fit)} align-${escapeAttribute(clean.stage.align)}">
${sections}
<script>${clean.fichaSettings?.movable ? `${FICHA_MOVE_SCRIPT}\n` : ''}${routerScript()}\n${AUDIO_PLAYER_SCRIPT}</script>
</body>
</html>`;
}
