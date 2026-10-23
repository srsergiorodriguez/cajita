<script>
  import { onMount } from 'svelte';
  import TopBar from './components/shell/TopBar.svelte';
  import LeftPanel from './components/shell/LeftPanel.svelte';
  import StageCanvas from './components/canvas/StageCanvas.svelte';
  import MapView from './components/map/MapView.svelte';
  import Inspector from './components/shell/Inspector.svelte';
  import PageStrip from './components/shell/PageStrip.svelte';
  import SettingsDialog from './components/shell/SettingsDialog.svelte';
  import ProjectLibrary from './components/library/ProjectLibrary.svelte';
  import ProjectMenu from './components/library/ProjectMenu.svelte';
  import PreviewDialog from './components/preview/PreviewDialog.svelte';
  import PublishDialog from './components/publish/PublishDialog.svelte';
  import ExportDialog from './components/export/ExportDialog.svelte';
  import ToastHost from './components/ui/ToastHost.svelte';
  import Icon from './components/ui/Icon.svelte';
  import KitchenSink from './dev/KitchenSink.svelte';
  import {
    applyPreferences,
    preferences,
    toggleCollapsed
  } from './lib/state/preferences.svelte.js';
  import {
    closeProject,
    copySelection,
    cutSelection,
    pasteSelection,
    deleteProjectById,
    deleteSelectedElements,
    takeProjectLock,
    downloadBundle,
    flushSave,
    redo,
    session,
    undo,
    updateElement
  } from './lib/state/project.svelte.js';
  import { refreshLibrary } from './lib/state/library.svelte.js';
  import { plural, t } from './lib/i18n/index.svelte.js';
  import { toast } from './lib/state/ui.svelte.js';
  import { editor, setView } from './lib/state/editor.svelte.js';

  const isDev =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('dev');

  let settingsOpen = $state(false);
  let projectMenuOpen = $state(false);
  let previewOpen = $state(false);
  let publishOpen = $state(false);
  let exportOpen = $state(false);

  $effect(() => {
    applyPreferences();
  });

  onMount(() => {
    void refreshLibrary();

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flushSave();
    };
    const onBeforeUnload = () => {
      void flushSave();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  });

  function isTypingTarget(target) {
    return (
      target instanceof HTMLElement &&
      (target.matches('input, textarea, select') || target.isContentEditable)
    );
  }

  function announceClipboard(result, action) {
    const noun =
      result.kind === 'asset'
        ? t('clipboard.asset')
        : plural(result.count, 'units.elementOne', 'units.elementMany');
    toast(`${action} ${result.kind === 'asset' ? result.name : noun}`, 'success', 1400);
  }

  function handleKeydown(event) {
    const typing = isTypingTarget(event.target);

    if (event.key === 'Escape') {
      preferences.leftOpen = false;
      preferences.inspectorOpen = false;
      if (!typing) {
        session.selectedElementIds = [];
        session.selectedAssetId = null;
      }
      return;
    }

    if (typing || !session.project) return;

    if (
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      ['c', 'x', 'v'].includes(event.key.toLowerCase())
    ) {
      const key = event.key.toLowerCase();
      let result;
      try {
        result =
          key === 'v'
            ? pasteSelection()
            : key === 'x'
              ? cutSelection()
              : copySelection();
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), 'error');
        return;
      }
      if (result) {
        event.preventDefault();
        announceClipboard(
          result,
          key === 'v'
            ? t('clipboard.pasted')
            : key === 'x'
              ? t('clipboard.cut')
              : t('clipboard.copied')
        );
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!session.selectedElementIds.length) return;
      event.preventDefault();
      deleteSelectedElements();
      return;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      if (!session.selectedElementIds.length) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const element = session.project.pages
        .flatMap((page) => page.elements ?? [])
        .find((item) => item.id === session.selectedElementIds[0]);
      if (!element) return;
      const dx =
        event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      updateElement(
        element.id,
        { frame: { x: element.frame.x + dx, y: element.frame.y + dy } },
        { coalesceKey: `nudge:${element.id}` }
      );
    }
  }

  async function handleCloseProject() {
    const closed = await closeProject();
    if (!closed) toast(t('status.error'), 'error');
  }

  async function handleDeleteProject() {
    if (!session.project) return;
    await deleteProjectById(session.project.id);
    toast(t('library.deleted'), 'success');
  }


  async function handleDownload() {
    try {
      await downloadBundle();
      toast(t('projectMenu.download'), 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }
</script>

<svelte:head>
  <title>{session.project ? `${session.project.title} — cajita` : 'cajita'}</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if isDev}
  <KitchenSink />
{:else if session.project}
  <div
    class="app-shell"
    class:left-open={preferences.leftOpen}
    class:inspector-open={preferences.inspectorOpen}
    class:left-collapsed={preferences.leftCollapsed}
    class:inspector-collapsed={preferences.inspectorCollapsed}
    class:strip-collapsed={preferences.stripCollapsed}
  >
    <TopBar
      onopensettings={() => (settingsOpen = true)}
      onopenprojectmenu={() => (projectMenuOpen = true)}
      onundo={undo}
      onredo={redo}
      view={editor.view}
      onviewchange={setView}
      onpreview={() => (previewOpen = true)}
      onexport={() => (exportOpen = true)}
      onpublish={() => (publishOpen = true)}
      onhome={handleCloseProject}
    />
    {#if session.lockConflict}
      <div class="lock-banner" role="status">
        <span>{t('lock.conflict')}</span>
        <button type="button" class="lock-takeover" onclick={takeProjectLock}>
          {t('lock.takeover')}
        </button>
      </div>
    {:else if session.recovered}
      <div class="lock-banner recover-banner" role="status">{t('recover.notice')}</div>
    {/if}
    <main class="app-main">
      <LeftPanel />
      <button
        class="panel-rail panel-rail--left"
        type="button"
        aria-label={t('top.expandPages')}
        title={t('top.expandPages')}
        onclick={() => toggleCollapsed('left')}
      >
        <Icon name="chevron-right" size={14} />
      </button>
      {#if editor.view === 'map'}
        <MapView />
      {:else}
        <StageCanvas />
      {/if}
      <Inspector />
      <button
        class="panel-rail panel-rail--right"
        type="button"
        aria-label={t('top.expandInspector')}
        title={t('top.expandInspector')}
        onclick={() => toggleCollapsed('inspector')}
      >
        <Icon name="chevron-left" size={14} />
      </button>
    </main>
    <PageStrip />
    <button
      class="strip-rail"
      type="button"
      aria-label={t('top.expandStrip')}
      title={t('top.expandStrip')}
      onclick={() => toggleCollapsed('strip')}
    >
      <Icon name="chevron-up" size={13} />
      <span>{t('strip.pages')}</span>
    </button>
  </div>

  <ProjectMenu
    bind:open={projectMenuOpen}
    ondownload={handleDownload}
    oncloseproject={handleCloseProject}
    ondelete={handleDeleteProject}
  />
  <PreviewDialog bind:open={previewOpen} />
  <PublishDialog bind:open={publishOpen} />
  <ExportDialog bind:open={exportOpen} />
{:else}
  <ProjectLibrary onopensettings={() => (settingsOpen = true)} />
{/if}

<div class="mobile-note">
  <div class="mobile-box" aria-hidden="true"></div>
  <h1>{t('app.name')}</h1>
  <p>{t('mobile.note')}</p>
</div>

<SettingsDialog bind:open={settingsOpen} />
<ToastHost />
