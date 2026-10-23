<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { formatBytes } from '../../lib/domain/model.js';
  import { session } from '../../lib/state/project.svelte.js';
  import { platform } from '../../lib/platform/index.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { open = $bindable(false) } = $props();
  let options = $state(null);
  let mode = $state('small');
  let busy = $state(false);
  let error = $state('');
  let wasOpen = false;

  const smallLimit = 20 * 1024 * 1024;
  const smallTooBig = $derived(
    Boolean(options) &&
      (options.small.bytes.byteLength > smallLimit || options.hasVideoAudio || options.hasFichas)
  );
  const recommended = $derived(smallTooBig ? 'full' : 'small');

  $effect(() => {
    if (open && !wasOpen) load();
    if (!open) {
      options = null;
      error = '';
      busy = false;
    }
    wasOpen = open;
  });

  async function load() {
    if (!session.project) return;
    busy = true;
    error = '';
    try {
      const result = await platform.site.options($state.snapshot(session.project));
      options = result;
      mode =
        result.small.bytes.byteLength > smallLimit || result.hasVideoAudio || result.hasFichas
          ? 'full'
          : 'small';
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }

  function download() {
    if (!options?.[mode]) return;
    const chosen = options[mode];
    platform.files.downloadBytes(chosen.bytes, chosen.name, chosen.mime);
    toast(t('export.done'), 'success');
    open = false;
  }
</script>

<Dialog bind:open title={t('export.title')}>
  <div class="export-dialog">
    <p class="lede">{t('export.lede')}</p>

    {#if busy}
      <div class="loading"><span class="pulse"></span>{t('export.calculating')}</div>
    {:else if error}
      <p class="error" role="alert">{error}</p>
      <div class="actions">
        <Button size="sm" variant="ghost" onclick={() => (open = false)}>{t('common.cancel')}</Button>
        <Button size="sm" variant="accent" onclick={load}>{t('export.retry')}</Button>
      </div>
    {:else if options}
      <div class="options">
        <button
          type="button"
          class="option"
          class:selected={mode === 'small'}
          onclick={() => (mode = 'small')}
        >
          <span class="option-head">
            <span class="eyebrow">{t('export.small')}</span>
            {#if recommended === 'small'}<span class="tag">{t('export.recommended')}</span>{/if}
          </span>
          <strong>{formatBytes(options.small.bytes.byteLength)}</strong>
          <span class="copy">{t('export.smallHint')}</span>
          {#if smallTooBig}<span class="warning">{t('export.smallWarning')}</span>{/if}
        </button>
        <button
          type="button"
          class="option"
          class:selected={mode === 'full'}
          onclick={() => (mode = 'full')}
        >
          <span class="option-head">
            <span class="eyebrow">{t('export.full')}</span>
            {#if recommended === 'full'}<span class="tag">{t('export.recommended')}</span>{/if}
          </span>
          <strong>{formatBytes(options.full.bytes.byteLength)}</strong>
          <span class="copy">{t('export.fullHint')}</span>
        </button>
      </div>
      <p class="summary">{t('export.summary', { pages: options.pageCount, assets: options.assetCount })}</p>
      <p class="note">{t('export.smallFixed')}<br />{t('export.publishFull')}</p>
      <div class="actions">
        <Button size="sm" variant="ghost" onclick={() => (open = false)}>{t('common.cancel')}</Button>
        <Button size="sm" variant="accent" onclick={download}>
          <Icon name="download" size={12} />
          {mode === 'small' ? t('export.downloadSmall') : t('export.downloadFull')}
        </Button>
      </div>
    {:else}
      <div class="actions">
        <Button size="sm" variant="ghost" onclick={() => (open = false)}>{t('common.cancel')}</Button>
        <Button size="sm" variant="accent" onclick={load}>{t('export.calculate')}</Button>
      </div>
    {/if}
  </div>
</Dialog>

<style>
  .export-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .lede,
  .summary,
  .note {
    margin: 0;
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.45;
  }
  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }
  .option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--ink);
    font-family: var(--font-ui);
    text-align: left;
    cursor: pointer;
  }
  .option.selected {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .option-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    width: 100%;
  }
  .eyebrow {
    color: var(--muted);
    font-size: var(--text-2xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .tag {
    padding: 1px 4px;
    background: var(--accent);
    color: var(--panel);
    font-size: var(--text-3xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .option strong {
    font-family: var(--font-wordmark);
    font-size: var(--text-xl);
    font-weight: var(--wordmark-weight);
  }
  .copy {
    color: var(--ink-2);
    font-size: var(--text-xs);
    line-height: 1.4;
  }
  .warning,
  .error {
    color: var(--danger);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
  .loading {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--muted);
    font-size: var(--text-xs);
  }
  .pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 900ms ease-in-out infinite alternate;
  }
  @keyframes pulse {
    from { opacity: 0.35; }
    to { opacity: 1; }
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line-soft);
  }
  @media (max-width: 560px) {
    .options { grid-template-columns: 1fr; }
  }
</style>
