<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Icon from '../ui/Icon.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import {
    configurePublish,
    exportSite,
    recordPublish,
    session
  } from '../../lib/state/project.svelte.js';
  import { platform } from '../../lib/platform/index.js';
  import { parseRepo } from '../../lib/domain/publish/plan.js';
  import { normalizeCustomDomain } from '../../lib/domain/publish/domain.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import { preferences } from '../../lib/state/preferences.svelte.js';

  let { open = $bindable(false) } = $props();

  let token = $state('');
  let remember = $state(false);
  let repo = $state('');
  let customDomain = $state('');
  let busy = $state(false);
  let progress = $state('');
  let progressParams = $state({});
  let errorCode = $state('');
  let errorDetail = $state('');
  let errorLink = $state('');
  let url = $state('');
  let unpublishConfirm = $state(false);
  let loadedFor = $state(null);

  const errorKeys = {
    PUBLISH_AUTH: 'publish.error.auth',
    PUBLISH_PERMISSION: 'publish.error.permission',
    PUBLISH_PAGES_SETUP: 'publish.error.pagesSetup',
    PUBLISH_CONFLICT: 'publish.error.conflict',
    PUBLISH_PRIVATE: 'publish.error.private',
    PUBLISH_REPO: 'publish.error.repo',
    PUBLISH_REPO_ACCESS: 'publish.error.repoAccess',
    PUBLISH_DOMAIN: 'publish.error.domain',
    PUBLISH_MISSING: 'publish.error.repo',
    PUBLISH_BUILD: 'publish.error.build',
    PUBLISH_TIMEOUT: 'publish.error.timeout',
    PUBLISH_LOCAL: 'publish.error.local',
    PUBLISH_FILE_TOO_LARGE: 'publish.error.fileTooLarge',
    NETWORK: 'publish.error.network'
  };

  const progressText = $derived(progress ? t(progress, progressParams) : '');
  const history = $derived(session.project?.publish?.history ?? []);
  const dateFormat = $derived(
    new Intl.DateTimeFormat(preferences.locale, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  );
  const errorText = $derived(
    errorCode ? t(errorKeys[errorCode] ?? 'publish.error.generic') : ''
  );

  function repoKey() {
    return session.project ? `cajita.publish.repo.${session.project.id}` : '';
  }

  function cacheKey(parsed, projectId) {
    return `cajita.publish.cache.${projectId}.${parsed.fullName.toLowerCase()}`;
  }

  function readCache(parsed) {
    if (!session.project) return null;
    try {
      const raw = localStorage.getItem(cacheKey(parsed, session.project.id));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeCache(parsed, result) {
    if (!session.project) return;
    localStorage.setItem(
      cacheKey(parsed, session.project.id),
      JSON.stringify({
        manifest: result.manifest,
        url: result.url,
        savedAt: new Date().toISOString()
      })
    );
  }

  async function load() {
    if (!session.project || loadedFor === session.project.id) return;
    loadedFor = session.project.id;
    const tokenInfo = await platform.secrets.getGithubTokenInfo();
    token = tokenInfo.token ?? '';
    remember = tokenInfo.remembered;
    repo =
      session.project.publish?.owner && session.project.publish?.repo
        ? `${session.project.publish.owner}/${session.project.publish.repo}`
        : (localStorage.getItem(repoKey()) ?? '');
    customDomain = session.project.publish?.customDomain ?? '';
    const parsed = parseRepo(repo);
    if (parsed) url = readCache(parsed)?.url ?? '';
  }

  $effect(() => {
    if (open) void load();
  });

  async function forgetToken() {
    await platform.secrets.clearGithubToken();
    token = '';
    remember = false;
    toast(t('publish.tokenForgotten'));
  }

  async function publish() {
    const parsed = parseRepo(repo);
    const cleanToken = token.replace(/\s+/g, '').replace(/^Bearer/i, '');
    const domain = normalizeCustomDomain(customDomain);
    if (customDomain.trim() && !domain) {
      errorCode = 'PUBLISH_DOMAIN';
      return;
    }
    if (!parsed) {
      errorCode = 'PUBLISH_REPO';
      return;
    }
    if (!cleanToken) {
      errorCode = 'PUBLISH_AUTH';
      return;
    }
    busy = true;
    errorCode = '';
    errorDetail = '';
    errorLink = '';
    url = '';
    progress = 'publish.progress.prepare';
    progressParams = {};
    try {
      token = cleanToken;
      await platform.secrets.setGithubToken(cleanToken, { remember });
      localStorage.setItem(repoKey(), parsed.fullName);
      configurePublish({
        owner: parsed.owner,
        repo: parsed.name,
        branch: 'gh-pages',
        customDomain: domain
      });
      const result = await platform.publisher.publish($state.snapshot(session.project), {
        token: cleanToken,
        repo: parsed.fullName,
        cached: readCache(parsed),
        onProgress: (key, params = {}) => {
          progress = key;
          progressParams = params;
        }
      });
      configurePublish({
        owner: parsed.owner,
        repo: parsed.name,
        branch: 'gh-pages',
        customDomain: domain,
        lastPublishedAt: new Date().toISOString()
      });
      url = result.url;
      writeCache(parsed, result);
      progress = '';
      toast(t('publish.success'));
    } catch (error) {
      errorCode = error?.code ?? 'PUBLISH_LOCAL';
      errorDetail = error?.detail || error?.message || '';
      errorLink = error?.url || '';
      progress = '';
    } finally {
      busy = false;
    }
  }

  async function downloadZip() {
    try {
      await exportSite();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  async function unpublish() {
    const parsed = parseRepo(repo);
    const cleanToken = token.replace(/\s+/g, '').replace(/^Bearer/i, '');
    const domain = normalizeCustomDomain(customDomain);
    if (customDomain.trim() && !domain) {
      errorCode = 'PUBLISH_DOMAIN';
      return;
    }
    if (!parsed || !cleanToken) return;
    busy = true;
    errorCode = '';
    try {
      await platform.publisher.unpublish({
        token: cleanToken,
        repo: parsed.fullName
      });
      localStorage.removeItem(cacheKey(parsed, session.project.id));
      recordPublish({
        kind: 'unpublish',
        at: new Date().toISOString(),
        owner: parsed.owner,
        repo: parsed.name,
        branch: 'gh-pages'
      });
      url = '';
      unpublishConfirm = false;
      toast(t('publish.unpublished'));
    } catch (error) {
      errorCode = error?.code ?? 'NETWORK';
    } finally {
      busy = false;
    }
  }
</script>

<Dialog bind:open title={t('publish.title')}>
  <p class="public-warning">{t('publish.publicWarning')}</p>

  <div class="publish-form">
    <div class="token-row">
      <Field
        label={t('publish.token')}
        type="password"
        bind:value={token}
        placeholder="github_pat_…"
        hint={t('publish.tokenHint')}
      />
      <div class="token-links">
        <a
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('publish.tokenCreate')}
        </a>
        {#if token}
          <button type="button" class="link-button" onclick={forgetToken}>
            {t('publish.forget')}
          </button>
        {/if}
      </div>
    </div>

    <label class="check">
      <input type="checkbox" bind:checked={remember} />
      <span>{t('publish.remember')}</span>
    </label>

    <Field
      label={t('publish.repo')}
      bind:value={repo}
      placeholder="usuario/mi-sitio"
      hint={t('publish.repoHint')}
    />
    <p class="branch-line">{t('publish.branch')}</p>
    <p class="branch-line">{t('publish.pagesPermissionHint')}</p>

    <p class="help-links">
      <a href="https://github.com/new" target="_blank" rel="noopener noreferrer">
        {t('publish.repoCreate')}
      </a>
    </p>
  </div>

  {#if progressText}
    <p class="status" role="status">
      <span class="dot" aria-hidden="true"></span>
      {progressText}
    </p>
  {/if}

  {#if errorText}
    <p class="error" role="alert">{errorText}</p>
    <div class="fallback-row">
      <p class="fallback">{t('publish.zipFallback')}</p>
      {#if errorCode === 'NETWORK'}
        <p class="fallback">{t('publish.networkHint')}</p>
      {/if}
      {#if errorCode === 'PUBLISH_FILE_TOO_LARGE'}
        <p class="fallback">{t('publish.fileTooLargeHint')}</p>
      {/if}
      {#if errorCode === 'PUBLISH_CONFLICT'}
        <p class="fallback">{t('publish.conflictHint')}</p>
      {/if}
      {#if errorCode === 'PUBLISH_REPO_ACCESS'}
        <p class="fallback">{t('publish.repoAccessHint')}</p>
        <p class="fallback">
          <a
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('publish.tokenSettings')}
          </a>
        </p>
        {#if errorLink}
          <p class="fallback">
            <a href={errorLink} target="_blank" rel="noopener noreferrer">
              {t('publish.openRepo')}
            </a>
          </p>
        {/if}
      {/if}
      {#if errorCode === 'PUBLISH_PAGES_SETUP'}
        <p class="fallback">{t('publish.pagesSetupHint')}</p>
        {#if errorLink}
          <p class="fallback">
            <a href={errorLink} target="_blank" rel="noopener noreferrer">
              {t('publish.pagesSettings')}
            </a>
          </p>
        {/if}
      {/if}
      {#if errorDetail && (errorCode === 'NETWORK' || errorCode === 'PUBLISH_LOCAL' || errorCode === 'PUBLISH_PERMISSION' || errorCode === 'PUBLISH_CONFLICT' || errorCode === 'PUBLISH_FILE_TOO_LARGE' || errorCode === 'PUBLISH_PAGES_SETUP' || errorCode === 'PUBLISH_REPO_ACCESS')}
        <details class="diagnostic">
          <summary>{t('publish.details')}</summary>
          <pre>{errorDetail}</pre>
        </details>
      {/if}
      <Button size="sm" variant="secondary" onclick={downloadZip}>
        {t('publish.downloadZip')}
      </Button>
    </div>
  {/if}

  {#if url}
    <div class="result">
      <p>{t('publish.success')}</p>
      <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      <Button size="sm" variant="secondary" onclick={() => platform.openExternal(url)}>
        <Icon name="external" size={12} />
        {t('publish.open')}
      </Button>
    </div>
  {/if}

  {#if history.length}
    <details class="history">
      <summary>{t('publish.history.title', { count: history.length })}</summary>
      <div class="history-list">
        {#each history as entry}
          <div class="history-row">
            <span class="history-date">{dateFormat.format(new Date(entry.at))}</span>
            <span class="history-kind">
              {entry.kind === 'publish'
                ? t('publish.history.published')
                : t('publish.history.unpublished')}
            </span>
            <span class="history-repo">{entry.owner}/{entry.repo}</span>
            {#if entry.kind === 'publish'}
              <span class="history-files">
                +{entry.uploaded ?? 0} / −{entry.deleted ?? 0}
              </span>
            {/if}
            {#if entry.url}
              <a href={entry.url} target="_blank" rel="noopener noreferrer">
                {t('publish.open')}
              </a>
            {/if}
            {#if entry.commit}
              <a
                class="history-commit"
                href={`https://github.com/${entry.owner}/${entry.repo}/commit/${entry.commit}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {entry.commit.slice(0, 7)}
              </a>
            {/if}
          </div>
        {/each}
      </div>
    </details>
  {/if}

  <div class="actions">
    <div class="actions-left">
      {#if url && !unpublishConfirm}
        <button
          type="button"
          class="link-button danger"
          onclick={() => (unpublishConfirm = true)}
        >
          {t('publish.unpublish')}
        </button>
      {:else if unpublishConfirm}
        <span class="confirm">{t('publish.unpublishConfirm')}</span>
        <Button size="sm" variant="danger" disabled={busy} onclick={unpublish}>
          {t('publish.unpublishYes')}
        </Button>
        <Button size="sm" variant="ghost" onclick={() => (unpublishConfirm = false)}>
          {t('common.cancel')}
        </Button>
      {/if}
    </div>
    <Button
      size="sm"
      variant="accent"
      disabled={busy || !token.trim() || !repo.trim()}
      onclick={publish}
    >
      {busy ? t('publish.publishing') : t('publish.submit')}
    </Button>
  </div>
</Dialog>

<style>
  .public-warning {
    padding: var(--space-3);
    border-left: 3px solid var(--accent);
    background: var(--panel-2);
    color: var(--ink);
    font-size: var(--text-xs);
    line-height: 1.45;
  }

  .publish-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .token-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .token-links,
  .help-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    font-size: var(--text-2xs);
  }

  a {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-2);
    font-size: var(--text-xs);
  }

  .branch-line,
  .fallback {
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .fallback-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .diagnostic {
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .diagnostic summary {
    color: var(--accent);
    cursor: pointer;
  }

  .diagnostic pre {
    max-height: 120px;
    overflow: auto;
    margin-top: var(--space-1);
    padding: var(--space-2);
    border: 1px solid var(--line-soft);
    background: var(--panel);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .link-button {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--accent);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  .link-button.danger {
    color: var(--danger);
  }

  .status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--muted);
    font-size: var(--text-xs);
  }

  .dot {
    width: 6px;
    height: 6px;
    background: var(--accent);
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }

  .error {
    color: var(--danger);
    font-size: var(--text-xs);
    line-height: 1.45;
  }

  .result {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--line);
    background: var(--panel-2);
    font-size: var(--text-xs);
  }

  .result p {
    flex: 0 0 100%;
    color: var(--ink);
  }

  .history {
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .history summary {
    color: var(--accent);
    cursor: pointer;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-top: var(--space-1);
    max-height: 168px;
    overflow: auto;
  }

  .history-row {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--panel-2);
  }

  .history-kind {
    color: var(--ink-2);
    text-transform: lowercase;
  }

  .history-repo {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .history-files {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .history-commit {
    font-variant-numeric: tabular-nums;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px solid var(--line-soft);
  }

  .actions-left {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .confirm {
    color: var(--muted);
    font-size: var(--text-2xs);
  }
</style>
