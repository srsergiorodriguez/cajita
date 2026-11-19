<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Select from '../ui/Select.svelte';
  import ZoomControls from '../canvas/ZoomControls.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { session } from '../../lib/state/project.svelte.js';
  import { editor, setViewportWidth } from '../../lib/state/editor.svelte.js';
  import { buildPreview } from '../../lib/export/preview.js';

  let { open = $bindable(false) } = $props();

  let pages = $state([]);
  let currentPageId = $state(null);
  let building = $state(false);
  let error = $state('');
  let iframeReady = $state(false);
  let iframeEl = $state(null);
  let previewFrameEl = $state(null);
  let previewZoom = $state(1);
  let previewFitZoom = $state(1);
  let previewFitMode = $state('width');
  const previewSrc = new URL('preview.html', window.location.href).href;
  const stageRatio = $derived(
    (session.project?.stage?.width ?? 1200) / (session.project?.stage?.height ?? 800)
  );
  const viewportWidth = $derived(editor.viewportWidth || session.project?.stage?.width || 1200);
  const stageHeight = $derived(viewportWidth / stageRatio);
  const viewportOptions = $derived(
    [...new Set([
      390,
      768,
      1024,
      session.project?.stage?.width,
      session.project?.stage?.maxWidth
    ].filter((width) => Number.isFinite(width) && width > 0))].sort((a, b) => a - b)
  );
  let previewAnimation = $state('');
  let animationTimer = null;

  const currentPage = $derived(
    pages.find((page) => page.id === currentPageId) ?? pages[0] ?? null
  );
  const siteBackground = $derived(
    session.project?.siteBackground ?? session.project?.theme?.background ?? '#f7f1e5'
  );
  const hasFicha = $derived(
    Boolean(
      session.project?.pages
        .find((page) => page.id === currentPageId)
        ?.elements?.some((element) => element.type === 'ficha')
    )
  );

  function clampPreviewZoom(value) {
    return Math.min(4, Math.max(0.1, Math.round(value * 100) / 100));
  }

  function setPreviewZoom(next) {
    previewZoom = clampPreviewZoom(next);
    previewFitMode = 'manual';
  }

  function applyPreviewFit() {
    if (!previewFrameEl || !viewportWidth) return;
    const rect = previewFrameEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const widthScale = rect.width / viewportWidth;
    const heightScale = rect.height / stageHeight;
    previewZoom = clampPreviewZoom(
      previewFitMode === 'page' ? Math.min(widthScale, heightScale) : widthScale
    );
    previewFitZoom = previewZoom;
  }

  function fitWidth() {
    previewFitMode = 'width';
    applyPreviewFit();
  }

  function fitPreview() {
    previewFitMode = 'page';
    applyPreviewFit();
  }

  function changeViewport(width) {
    setViewportWidth(width);
    previewFitMode = 'width';
  }

  function animateOutgoing() {
    const transition = currentPage?.transition;
    if (transition !== 'fade' && transition !== 'slide') return;
    previewAnimation = transition;
    clearTimeout(animationTimer);
    animationTimer = setTimeout(() => {
      previewAnimation = '';
    }, 1000);
  }

  $effect(() => () => clearTimeout(animationTimer));

  $effect(() => {
    if (open) {
      currentPageId = session.activePageId;
      previewAnimation = '';
      previewZoom = 1;
      previewFitZoom = 1;
      previewFitMode = 'width';
    } else {
      currentPageId = null;
      previewAnimation = '';
    }
  });

  $effect(() => {
    if (!open || previewFitMode === 'manual') return;
    previewFrameEl;
    viewportWidth;
    stageHeight;
    applyPreviewFit();
  });

  $effect(() => {
    if (!open || !session.project) return;
    let cancelled = false;
    building = true;
    error = '';
    buildPreview(session.project)
      .then((result) => {
        if (cancelled) return;
        pages = result.pages;
        if (!pages.some((page) => page.id === currentPageId)) {
          currentPageId =
            pages.find((page) => page.id === session.project.startPageId)?.id ??
            pages[0]?.id ??
            null;
        }
      })
      .catch((err) => {
        if (!cancelled) error = err instanceof Error ? err.message : String(err);
      })
      .finally(() => {
        if (!cancelled) building = false;
      });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (!iframeReady || !currentPage) return;
    const html = currentPage.html;
    iframeEl?.contentWindow?.postMessage(
      { type: 'cajita:preview:render', html },
      window.location.origin
    );
  });

  $effect(() => {
    function onMessage(event) {
      if (event.data?.type !== 'cajita:preview:navigate') return;
      const page = pages.find((item) => item.id === event.data.pageId);
      if (page && page.id !== currentPageId) {
        animateOutgoing();
        currentPageId = page.id;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  });

  function resetFichas() {
    iframeEl?.contentDocument?.querySelector('[data-ficha-reset]')?.click();
  }

  function selectPage(pageId) {
    if (pageId === currentPageId) return;
    animateOutgoing();
    currentPageId = pageId;
  }
</script>

<Dialog bind:open title={t('preview.title')} wide>
  <div class="preview-bar">
    <Select
      label={t('preview.page')}
      value={currentPageId ?? ''}
      options={pages.map((page) => ({ value: page.id, label: page.title }))}
      onchange={selectPage}
    />
    {#if building}<span class="status">{t('preview.building')}</span>{/if}
    {#if hasFicha && session.project?.fichaSettings?.movable}
      <Button size="sm" variant="ghost" onclick={resetFichas}>
        {t('preview.resetFichas')}
      </Button>
    {/if}
    <ZoomControls
      zoom={previewZoom}
      viewport={viewportWidth}
      {viewportOptions}
      onviewport={changeViewport}
      onZoomOut={() => setPreviewZoom(previewZoom - 0.1)}
      onZoomIn={() => setPreviewZoom(previewZoom + 0.1)}
      onFitWidth={fitWidth}
      onFitPage={fitPreview}
      fitWidthActive={previewFitMode === 'width'}
      fitPageActive={previewFitMode === 'page'}
      onActualSize={() => setPreviewZoom(1)}
      actualSizeActive={previewFitMode === 'manual' && Math.abs(previewZoom - 1) < 0.005}
    />
  </div>
  {#if error}
    <p class="error">{error}</p>
  {:else}
    <div class="preview-viewport" style:background={siteBackground}>
      <div
        class="preview-frame"
        bind:this={previewFrameEl}
        class:fade={previewAnimation === 'fade'}
        class:slide={previewAnimation === 'slide'}
        style:background={siteBackground}
      >
      <div
        class="preview-surface"
        style:width={`${viewportWidth * previewZoom}px`}
        style:height={`${stageHeight * previewZoom}px`}
      >
        <iframe
          bind:this={iframeEl}
          src={previewSrc}
          title={t('preview.title')}
          style:width={`${viewportWidth}px`}
          style:height={`${stageHeight}px`}
          style:transform={`scale(${previewZoom})`}
          style:background={siteBackground}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
          onload={() => {
            iframeReady = true;
          }}
        ></iframe>
      </div>
      </div>
    </div>
  {/if}
</Dialog>

<style>
  .preview-bar {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .preview-bar :global(.field) {
    flex: 0 0 260px;
  }

  .status {
    padding-bottom: 6px;
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .error {
    color: var(--danger);
    font-size: var(--text-xs);
  }

  .preview-viewport {
    height: min(68vh, 720px);
    overflow: hidden;
    border: var(--border-control) solid var(--line);
  }

  .preview-frame {
    height: 100%;
    overflow: auto;
  }

  .preview-surface {
    position: relative;
    margin: auto;
  }

  .preview-surface iframe {
    display: block;
    border: 0;
    transform-origin: top left;
  }

  .preview-frame.fade {
    animation: preview-fade 1000ms ease both;
  }

  .preview-frame.slide {
    animation: preview-slide 1000ms ease both;
  }

  @keyframes preview-fade {
    from {
      opacity: 0;
    }
  }

  @keyframes preview-slide {
    from {
      transform: translateX(100%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .preview-frame.fade,
    .preview-frame.slide {
      animation: none;
    }
  }

</style>
