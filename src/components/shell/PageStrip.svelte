<script>
  import { t } from '../../lib/i18n/index.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import IconButton from '../ui/IconButton.svelte';
  import PageMiniature from './PageMiniature.svelte';
  import MediaPanel from './MediaPanel.svelte';
  import AddTile from '../ui/AddTile.svelte';
  import { toggleCollapsed } from '../../lib/state/preferences.svelte.js';
  import { editor, setView } from '../../lib/state/editor.svelte.js';
  import {
    addPage,
    session,
    setActivePage
  } from '../../lib/state/project.svelte.js';

  const pages = $derived(session.project?.pages ?? []);
  function addNewPage() {
    try {
      addPage(t('page.newTitle', { number: pages.length + 1 }));
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

</script>

<footer class="page-strip">
  <div class="strip-half pages-half">
  <span class="strip-label">{t('strip.pages')}</span>

  <div class="cards">
    {#each pages as item, index (item.id)}
      <button
        type="button"
        class="page-card"
        class:active={item.id === session.activePageId}
        aria-current={item.id === session.activePageId ? 'page' : undefined}
        onclick={() => {
          setActivePage(item.id);
          if (editor.view === 'map') setView('page');
        }}
      >
        <div class="mini" aria-hidden="true"><PageMiniature project={session.project} page={item} /></div>
        <div class="pc-label">
          <b>{item.title}</b>
          <span>{String(index + 1).padStart(2, '0')}</span>
        </div>
        {#if item.id === session.activePageId}<span class="active-tab"></span>{/if}
        {#if item.id === session.project?.startPageId}
          <span class="start-mark">{t('left.start')}</span>
        {/if}
      </button>
    {/each}

    <AddTile
      label={t('page.add')}
      width="44px"
      height="72px"
      onclick={addNewPage}
    />
  </div>

  <div class="strip-collapse">
    <IconButton
      label={t('top.collapseStrip')}
      icon="chevron"
      size={24}
      iconSize={12}
      variant="ghost"
      onclick={() => toggleCollapsed('strip')}
    />
  </div>
  </div>
  <div class="strip-half media-half">
    <span class="strip-label">{t('left.media')}</span>
    <MediaPanel compact />
  </div>
</footer>

<style>
  .page-strip {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    background: var(--panel);
    border-top: var(--border-control) solid var(--line);
  }

  .strip-half {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    overflow: hidden;
    padding: var(--space-2) var(--space-3);
  }

  .pages-half {
    flex: 1 1 56%;
  }

  .media-half {
    flex: 0 0 44%;
    border-left: 1px solid var(--line-soft);
  }

  .strip-label {
    flex: 0 0 auto;
    padding-right: var(--space-1);
    color: var(--muted);
    font-size: var(--text-2xs);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }

  .cards {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--line-soft) transparent;
  }

  .page-card {
    position: relative;
    flex: 0 0 auto;
    width: 120px;
    height: 72px;
    padding: var(--space-1);
    border: var(--border-control) solid var(--line);
    border-radius: 0;
    background: var(--panel-2);
    box-shadow: var(--shadow-card);
    color: var(--ink);
    text-align: left;
    overflow: hidden;
  }

  .page-card.active {
    border-color: var(--selection);
    box-shadow: var(--page-active-shadow);
  }

  .active-tab {
    position: absolute;
    left: -1px;
    right: -1px;
    top: -1px;
    height: 4px;
    background: var(--accent);
  }

  .start-mark {
    position: absolute;
    right: 3px;
    top: 3px;
    padding: 0 2px;
    background: var(--stamp-bg);
    color: var(--stamp-ink);
    font-size: var(--text-3xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .mini {
    position: relative;
    height: 43px;
    margin-bottom: 3px;
    overflow: hidden;
    border-bottom: 1px solid var(--line-soft);
  }

  
  .pc-label {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    font-size: var(--text-2xs);
    line-height: 1.2;
  }

  .pc-label b {
    overflow: hidden;
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pc-label span {
    color: var(--muted);
  }

  .strip-collapse {
    flex: 0 0 auto;
    margin-left: auto;
  }

</style>