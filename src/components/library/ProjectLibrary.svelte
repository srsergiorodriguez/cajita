<script>
  import Button from '../ui/Button.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import Icon from '../ui/Icon.svelte';
  import IconButton from '../ui/IconButton.svelte';
  import NewProjectDialog from './NewProjectDialog.svelte';
  import ProjectThumb from './ProjectThumb.svelte';
  import { plural, t } from '../../lib/i18n/index.svelte.js';
  import { formatBytes } from '../../lib/domain/model.js';
  import { library, refreshLibrary } from '../../lib/state/library.svelte.js';
  import {
    deleteProjectById,
    importBundleFile,
    openProject
  } from '../../lib/state/project.svelte.js';
  import {
    preferences,
    setLocale,
    toggleMode
  } from '../../lib/state/preferences.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { onopensettings, onopentutorial } = $props();
  let newOpen = $state(false);
  let fileInput;
  let importing = $state(false);
  let deleteTarget = $state(null);
  let deleteOpen = $state(false);
  let dragging = $state(false);

  const dateFormatter = $derived(
    new Intl.DateTimeFormat(preferences.locale, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  );

  function openBundlePicker() {
    if (importing) return;
    fileInput?.click();
  }

  async function handleFile(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) await importFile(file);
  }

  async function importFile(file) {
    if (!/\.(cajita|zip)$/i.test(file.name)) {
      toast(t('import.error'), 'error');
      return;
    }
    importing = true;
    try {
      const project = await importBundleFile(file);
      toast(t('library.imported', { name: project.title }), 'success');
    } catch (error) {
      toast(
        `${t('import.error')} ${error instanceof Error ? error.message : ''}`,
        'error'
      );
    } finally {
      importing = false;
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    dragging = true;
  }

  function handleDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    dragging = false;
  }

  async function handleDrop(event) {
    event.preventDefault();
    dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) await importFile(file);
  }

  async function open(item) {
    try {
      await openProject(item.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function switchLocale() {
    setLocale(preferences.locale === 'es' ? 'en' : 'es');
  }

  function askDelete(item) {
    deleteTarget = item;
    deleteOpen = true;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProjectById(deleteTarget.id);
      await refreshLibrary();
      toast(t('library.deleted'), 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      deleteTarget = null;
    }
  }

  function savedLabel(item) {
    if (!item.savedAt) return '';
    return t('library.saved', { date: dateFormatter.format(new Date(item.savedAt)) });
  }
</script>

<div
  class="library-shell"
  class:dragging
  role="region"
  aria-label={t('library.title')}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <header class="library-topbar">
    <div class="brand">
      <span class="wordmark">{t('app.name')}</span>
      <span class="tagline">{t('library.subtitle')}</span>
    </div>
    <div class="actions">
      <IconButton
        label={t('top.mode')}
        icon={preferences.mode === 'light' ? 'moon' : 'sun'}
        onclick={toggleMode}
      />
      <IconButton
        label={t('top.language')}
        icon="language"
        onclick={switchLocale}
      />
      <IconButton label={t('top.settings')} icon="settings" onclick={onopensettings} />
    </div>
  </header>

  <main class="library-main">
    <header class="library-hero">
      <div>
        <p class="mono-label">cajita</p>
        <h1>{t('library.title')}</h1>
        <p class="lede">{t('library.lede')}</p>
      </div>
      <div class="hero-actions">
        <Button variant="accent" onclick={() => (newOpen = true)}>
          <Icon name="plus" size={14} />
          {t('library.new')}
        </Button>
        <Button onclick={openBundlePicker} disabled={importing}>
          <Icon name="folder" size={14} />
          {importing ? t('library.importing') : t('library.open')}
        </Button>
        <Button variant="ghost" onclick={onopentutorial}>
          <Icon name="help" size={14} />
          {t('library.tutorial')}
        </Button>
      </div>
    </header>

    {#if library.error}
      <div class="library-error">{library.error}</div>
    {/if}

    {#if library.loading}
      <p class="library-status">{t('library.loading')}</p>
    {:else if library.items.length === 0}
      <section class="empty-library">
        <div class="empty-box" aria-hidden="true"></div>
        <h2>{t('library.emptyTitle')}</h2>
        <p>{t('library.emptyHint')}</p>
        <Button variant="accent" onclick={() => (newOpen = true)}>
          {t('library.emptyAction')}
        </Button>
      </section>
    {:else}
      <section class="project-grid" aria-label={t('library.projects')}>
        {#each library.items as item (item.id)}
          <article class="project-card">
            <button class="card-main" type="button" onclick={() => open(item)}>
              <span
                class="cover"
                style={`--cover-ratio:${item.stageWidth ?? 1200}/${item.stageHeight ?? 800}`}
                aria-hidden="true"
              >
                <ProjectThumb {item} />
              </span>
              <span class="card-copy">
                <strong>{item.title}</strong>
                <span class="card-meta">
                  {plural(item.pages, 'units.pageOne', 'units.pageMany')} ·
                  {plural(item.media, 'units.assetOne', 'units.assetMany')}
                </span>
                <span class="card-foot">
                  <span>{formatBytes(item.bytes)}</span>
                  <span>{savedLabel(item)}</span>
                </span>
              </span>
            </button>
            <IconButton
              label={t('projectMenu.delete')}
              icon="trash"
              variant="bare"
              size={26}
              iconSize={13}
              onclick={() => askDelete(item)}
            />
          </article>
        {/each}
      </section>
    {/if}
  </main>

  <footer class="library-footer">
    <span>{t('library.storage')} · {formatBytes(library.usage.bytes)}</span>
    <span>{plural(library.usage.projects, 'units.projectOne', 'units.projectMany')}</span>
    <span class="footer-note">{t('library.emptyHint')}</span>
  </footer>

  {#if dragging}
    <div class="drop-overlay">{t('library.drop')}</div>
  {/if}
</div>

<input
  bind:this={fileInput}
  type="file"
  accept=".cajita,application/zip"
  hidden
  onchange={handleFile}
/>

<NewProjectDialog bind:open={newOpen} />
<ConfirmDialog
  bind:open={deleteOpen}
  title={t('projectMenu.delete')}
  message={t('projectMenu.deleteHint')}
  confirmLabel={t('projectMenu.confirmDelete')}
  onconfirm={confirmDelete}
/>

<style>
  .library-shell {
    position: relative;
    height: 100vh;
    display: grid;
    grid-template-rows: 56px minmax(0, 1fr) auto;
    background: linear-gradient(180deg, var(--panel) 0, var(--bg) 260px), var(--bg);
    color: var(--ink);
    overflow: hidden;
  }

  .library-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: 0 var(--space-4);
    border-bottom: var(--border-control) solid var(--line);
    background: var(--panel);
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    min-width: 0;
  }

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

  .tagline {
    overflow: hidden;
    color: var(--muted);
    font-size: var(--text-2xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .library-main {
    min-height: 0;
    overflow: auto;
    max-width: 1180px;
    width: 100%;
    margin: 0 auto;
    padding: var(--space-7) var(--space-6) var(--space-6);
    scrollbar-width: thin;
    scrollbar-color: var(--line-soft) transparent;
  }

  .library-hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-6);
    margin-bottom: var(--space-7);
  }

  .library-hero h1 {
    margin: var(--space-1) 0 var(--space-2);
    font-family: var(--font-wordmark);
    font-size: var(--text-3xl);
    font-weight: var(--wordmark-weight);
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .lede {
    max-width: 46ch;
    color: var(--muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .hero-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .drop-overlay {
    position: fixed;
    inset: var(--space-4);
    z-index: var(--z-overlay);
    display: grid;
    place-items: center;
    border: var(--border-strong) dashed var(--accent);
    background: color-mix(in srgb, var(--panel) 88%, transparent);
    color: var(--ink);
    font-family: var(--font-wordmark);
    font-size: var(--text-xl);
    pointer-events: none;
  }

  .library-error {
    margin-bottom: var(--space-4);
    padding: var(--space-3);
    border: var(--border-control) solid var(--danger);
    color: var(--danger);
    font-size: var(--text-xs);
  }

  .library-status {
    color: var(--muted);
    font-size: var(--text-sm);
  }

  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--space-5);
  }

  .project-card {
    position: relative;
    display: flex;
    flex-direction: column;
    border: var(--border-control) solid var(--line);
    background: var(--panel-2);
    box-shadow: var(--shadow-card);
  }

  .card-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    font-family: var(--font-ui);
    text-align: left;
  }

  .cover {
    --cover-bg: var(--site-papel-bg);
    --cover-ink: var(--site-papel-ink);
    --cover-accent: var(--site-papel-accent);
    position: relative;
    display: block;
    height: auto;
    aspect-ratio: var(--cover-ratio, 3 / 2);
    overflow: hidden;
    border-bottom: var(--border-control) solid var(--line);
    background:
      radial-gradient(
          color-mix(in srgb, var(--cover-ink) 12%, transparent) 0.7px,
          transparent 1px
        )
        0 0 / 5px 5px,
      var(--cover-bg, var(--panel-3));
    color: var(--cover-ink, var(--ink));
  }

  .card-copy {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-3) var(--space-4);
    min-width: 0;
  }

  .card-copy strong {
    overflow: hidden;
    font-size: var(--text-md);
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-meta,
  .card-foot {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .card-foot {
    padding-top: var(--space-1);
    border-top: 1px solid var(--line-soft);
  }

  .project-card :global(.icon-btn) {
    position: absolute;
    right: var(--space-2);
    top: var(--space-2);
    background: var(--panel);
  }

  .empty-library {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    min-height: 300px;
    padding: var(--space-7);
    border: 1px dashed var(--line-soft);
    text-align: center;
  }

  .empty-box {
    width: 96px;
    height: 64px;
    border: var(--border-strong) solid var(--ink);
    background: var(--accent-3);
    box-shadow: var(--shadow-card);
    transform: rotate(-2deg);
  }

  .empty-library h2 {
    margin: var(--space-2) 0 0;
    font-family: var(--font-wordmark);
    font-size: var(--text-xl);
    font-weight: var(--wordmark-weight);
    letter-spacing: -0.02em;
  }

  .empty-library p {
    max-width: 42ch;
    color: var(--muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .library-footer {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-2) var(--space-4);
    border-top: var(--border-control) solid var(--line);
    background: var(--panel);
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .footer-note {
    margin-left: auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 760px) {
    .tagline,
    .footer-note {
      display: none;
    }

    .library-hero {
      flex-direction: column;
      align-items: flex-start;
    }

    .library-main {
      padding: var(--space-5) var(--space-4);
    }
  }
</style>
