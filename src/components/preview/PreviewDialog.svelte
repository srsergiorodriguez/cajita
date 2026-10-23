<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Select from '../ui/Select.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { session } from '../../lib/state/project.svelte.js';
  import { buildPreview } from '../../lib/export/preview.js';

  let { open = $bindable(false) } = $props();

  let pages = $state([]);
  let currentPageId = $state(null);
  let building = $state(false);
  let error = $state('');
  let iframeReady = $state(false);
  let iframeEl = $state(null);
  const previewSrc = new URL('preview.html', window.location.href).href;
  let previewAnimation = $state('');
  let animationTimer = null;

  const currentPage = $derived(
    pages.find((page) => page.id === currentPageId) ?? pages[0] ?? null
  );
  const hasFicha = $derived(
    Boolean(
      session.project?.pages
        .find((page) => page.id === currentPageId)
        ?.elements?.some((element) => element.type === 'ficha')
    )
  );

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
    } else {
      currentPageId = null;
      previewAnimation = '';
    }
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
  </div>
  {#if error}
    <p class="error">{error}</p>
  {:else}
    <div
      class="preview-frame"
      class:fade={previewAnimation === 'fade'}
      class:slide={previewAnimation === 'slide'}
    >
      <iframe
        bind:this={iframeEl}
        src={previewSrc}
        title={t('preview.title')}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
        onload={() => {
          iframeReady = true;
        }}
      ></iframe>
    </div>
  {/if}
</Dialog>

<style>
  .preview-bar {
    display: flex;
    align-items: flex-end;
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

  .preview-frame {
    height: min(68vh, 720px);
    overflow: hidden;
    border: var(--border-control) solid var(--line);
    background: var(--stage);
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

  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: var(--stage);
  }
</style>
