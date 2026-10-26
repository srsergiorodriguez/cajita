import { buildSite } from './site.js';
import { fontFaces } from './fonts.js';
import { assetUrl } from '../state/asset-urls.svelte.js';
import { platform } from '../platform/index.js';
import { FICHA_MOVE_SCRIPT } from './ficha-move.js';
import { AUDIO_PLAYER_SCRIPT } from './audio-player.js';

export const PREVIEW_SCRIPT = `
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-cajita-page]');
  if (!link) return;
  event.preventDefault();
  parent.postMessage({ type: 'cajita:preview:navigate', pageId: link.dataset.cajitaPage }, '*');
});
`;

/**
 * Build page HTML for the preview. Internal page links become data attributes
 * handled by PREVIEW_SCRIPT; the parent swaps the iframe document. Assets and
 * custom fonts use the same URL caches as the editor.
 */
export async function buildPreview(project) {
  const usedAssets = new Map();
  const htmlContent = new Map();
  const allAssetIds = new Set();
  for (const page of project.pages ?? []) {
    for (const element of page.elements ?? []) {
      if (element.assetId) allAssetIds.add(element.assetId);
      if (element.type === 'ficha') {
        const assetId = project.fichas?.[element.fichaId]?.assetId;
        if (assetId) allAssetIds.add(assetId);
      }
    }
  }
  for (const font of Object.values(project.fonts ?? {})) {
    if (font.assetId) allAssetIds.add(font.assetId);
  }

  await Promise.all(
    [...allAssetIds].map(async (assetId) => {
      const row = await platform.assets.get(project.id, assetId);
      if (row?.meta?.kind === 'html' && row.blob) {
        htmlContent.set(assetId, await row.blob.text());
        return;
      }
      const url = await assetUrl(project.id, assetId);
      if (url) usedAssets.set(assetId, url);
    })
  );

  const faces = fontFaces(project, {
    builtinHref: (file) => file.url,
    customHref: (font) => usedAssets.get(font.assetId) ?? ''
  });

  const site = buildSite(project, {
    assetHref: (_project, _page, asset) => usedAssets.get(asset.id) ?? '',
    htmlContent,
    preview: true,
    inlineCss: true,
    inlineScript: `${PREVIEW_SCRIPT}\n${AUDIO_PLAYER_SCRIPT}${project.fichaSettings?.movable ? `\n${FICHA_MOVE_SCRIPT}` : ''}`,
    fontFaces: faces
  });

  return {
    pages: site.pages.map((page) => ({
      id: page.page.id,
      title: page.page.title,
      transition: page.page.transition ?? 'cut',
      html: page.html
    }))
  };
}
