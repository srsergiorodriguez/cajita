<script>
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import IconButton from '../ui/IconButton.svelte';
  import { t, localeLabel } from '../../lib/i18n/index.svelte.js';
  import {
    preferences,
    toggleMode,
    setLocale,
    togglePanel
  } from '../../lib/state/preferences.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import {
    activePage,
    canRedo,
    canUndo,
    session
  } from '../../lib/state/project.svelte.js';

  let {
    view = 'page',
    onviewchange,
    onopensettings,
    onopentutorial,
    onopenprojectmenu,
    onundo,
    onredo,
    onpreview,
    onexport,
    onpublish,
    onhome
  } = $props();

  const page = $derived(activePage());
  const projectTitle = $derived(session.project?.title ?? t('app.project'));
  const pageLabel = $derived(
    page ? `${projectTitle} / ${page.title}` : t('stage.kicker')
  );
  const saveLabel = $derived(
    session.status === 'saving'
      ? t('top.saving')
      : session.status === 'error'
        ? t('top.saveError')
        : session.status === 'locked'
          ? t('top.locked')
          : t('top.saved')
  );

  function switchMode() {
    const next = preferences.mode === 'light' ? 'dark' : 'light';
    toggleMode();
    toast(t('toast.mode', { mode: t(`mode.${next}`) }), 'info', 1800);
  }

  function switchLocale(locale) {
    setLocale(locale);
    toast(t('toast.language', { language: localeLabel(locale) }), 'info', 1800);
  }
</script>

<header class="topbar">
  <span class="panel-toggle left-toggle">
    <IconButton
      label={t('top.pages')}
      icon="pages"
      variant="ghost"
      onclick={() => togglePanel('left')}
    />
  </span>

  <div class="brand">
    <button
      type="button"
      class="brand-home"
      title={t('top.home')}
      aria-label={t('top.home')}
      onclick={onhome}
    >
      <span class="wordmark">{t('app.name')}</span>
    </button>
    <span class="project">{projectTitle}</span>
  </div>

  <nav class="viewtabs" aria-label={t('top.views')}>
    <button
      class="viewtab"
      class:active={view === 'page'}
      type="button"
      aria-current={view === 'page' ? 'page' : undefined}
      onclick={() => onviewchange?.('page')}
    >
      {t('top.viewPage')}
    </button>
    <button
      class="viewtab"
      class:active={view === 'map'}
      type="button"
      aria-current={view === 'map' ? 'page' : undefined}
      onclick={() => onviewchange?.('map')}
    >
      {t('top.viewMap')}
    </button>
  </nav>

  <span class="page-title">{pageLabel}</span>

  <div class="actions">
    <span class="panel-toggle inspector-toggle">
      <IconButton
        label={t('top.properties')}
        icon="panel"
        variant="ghost"
        onclick={() => togglePanel('inspector')}
      />
    </span>

    <IconButton
      label={t('top.projectMenu')}
      icon="menu"
      variant="ghost"
      onclick={onopenprojectmenu}
    />
    <IconButton
      label={t('top.undo')}
      icon="undo"
      disabled={!canUndo()}
      onclick={onundo}
    />
    <IconButton
      label={t('top.redo')}
      icon="redo"
      disabled={!canRedo()}
      onclick={onredo}
    />
    <span
      class="saved"
      class:error={session.status === 'error'}
      class:locked={session.status === 'locked'}
    >
      {saveLabel}
    </span>

    <Button size="sm" onclick={onpreview}>
      <Icon name="play" size={12} />
      <span class="btn-label">{t('top.preview')}</span>
    </Button>
    <Button size="sm" onclick={onexport}>
      <Icon name="download" size={12} />
      <span class="btn-label">{t('top.exportSite')}</span>
    </Button>
    <Button variant="accent" size="sm" onclick={onpublish}>
      <Icon name="publish" size={12} />
      <span class="btn-label">{t('top.publish')}</span>
    </Button>

    <IconButton
      label={t('top.mode')}
      icon={preferences.mode === 'light' ? 'moon' : 'sun'}
      onclick={switchMode}
    />

    <IconButton
      label={t('top.language')}
      icon="language"
      onclick={() => switchLocale(preferences.locale === 'es' ? 'en' : 'es')}
    />

    <IconButton label={t('top.tutorial')} icon="help" onclick={onopentutorial} />
    <IconButton label={t('top.settings')} icon="settings" onclick={onopensettings} />
  </div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 0 var(--space-3);
    background: var(--panel);
    border-bottom: var(--border-control) solid var(--line);
    position: relative;
    z-index: var(--z-topbar);
    min-width: 0;
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    min-width: 202px;
  }

  .brand-home {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }

  .brand-home:hover { color: var(--accent); }

  .wordmark {
    font-family: var(--font-wordmark);
    font-size: var(--wordmark-size);
    font-weight: var(--wordmark-weight);
    letter-spacing: var(--wordmark-tracking);
    line-height: 1;
    text-transform: lowercase;
    text-shadow: var(--wordmark-shadow);
    border-bottom: var(--wordmark-rule);
    padding-bottom: 1px;
    white-space: nowrap;
  }

  .project {
    overflow: hidden;
    color: var(--muted);
    font-size: var(--text-2xs);
    letter-spacing: 0.04em;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .project::before {
    content: '●';
    margin-right: 5px;
    color: var(--accent-2);
    font-size: var(--text-3xs);
    vertical-align: 2px;
  }

  .viewtabs {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .viewtab {
    min-height: 30px;
    padding: 0 9px;
    border: var(--border-control) solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    text-transform: lowercase;
    white-space: nowrap;
  }

  .viewtab.active {
    border-color: var(--line);
    background: var(--accent-3);
    color: var(--ink);
    box-shadow: var(--shadow-btn);
  }

  .viewtab:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .page-title {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    color: var(--muted);
    font-size: var(--text-2xs);
    letter-spacing: 0.09em;
    text-transform: uppercase;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-left: auto;
    min-width: 0;
  }

  .saved {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--muted);
    font-size: var(--text-2xs);
    white-space: nowrap;
  }

  .saved::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--saved);
  }

  .saved.error::before {
    background: var(--danger);
  }

  .saved.locked::before {
    background: var(--warning);
  }

  .btn-label {
    display: inline;
  }

  @media (max-width: 1240px) {
    .page-title {
      display: none;
    }
  }

  @media (max-width: 1080px) {
    .project {
      display: none;
    }

    .brand {
      min-width: 116px;
    }
  }

  @media (max-width: 980px) {
    .btn-label {
      display: none;
    }
  }

  @media (max-width: 860px) {
    .saved {
      display: none;
    }
  }
</style>
