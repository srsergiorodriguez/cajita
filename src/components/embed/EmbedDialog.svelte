<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { addElement } from '../../lib/state/project.svelte.js';
  import { parseEmbed } from '../../lib/domain/embeds.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { open = $bindable(false), provider = 'youtube' } = $props();

  let url = $state('');
  let title = $state('');
  let caption = $state('');
  let error = $state('');
  let loadedProvider = $state('');

  $effect(() => {
    if (open && loadedProvider !== provider) {
      loadedProvider = provider;
      url = '';
      title = '';
      caption = '';
      error = '';
    }
    if (!open) loadedProvider = '';
  });

  const providerLabel = $derived(
    provider === 'observable'
      ? t('embed.observable')
      : provider === 'p5'
        ? t('embed.p5')
        : t('embed.youtube')
  );

  function insert() {
    const parsed = parseEmbed(provider, url);
    if (!parsed) {
      error = t('embed.invalid');
      return;
    }
    try {
      addElement('embed', {
        provider,
        url: parsed.url,
        title: title.trim() || parsed.title,
        caption: caption.trim()
      });
      open = false;
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }
</script>

<Dialog bind:open title={providerLabel}>
  <div class="embed-form">
    <p class="lede">{t('embed.lede')}</p>
    <Field
      label={t('embed.url')}
      bind:value={url}
      placeholder={provider === 'observable'
        ? 'https://observablehq.com/@usuario/notebook'
        : provider === 'p5'
          ? 'https://editor.p5js.org/usuario/full/…'
          : 'https://www.youtube.com/watch?v=…'}
      hint={t('embed.urlHint')}
      oninput={() => (error = '')}
    />
    <Field label={t('embed.name')} bind:value={title} placeholder={providerLabel} />
    <Field label={t('embed.caption')} bind:value={caption} />
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <p class="note">{t('embed.note')}</p>
    <div class="actions">
      <Button variant="ghost" size="sm" onclick={() => (open = false)}>
        {t('common.cancel')}
      </Button>
      <Button variant="accent" size="sm" onclick={insert}>
        {t('embed.insert')}
      </Button>
    </div>
  </div>
</Dialog>

<style>
  .embed-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .lede,
  .note {
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.45;
  }

  .error {
    color: var(--danger);
    font-size: var(--text-xs);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--line-soft);
  }
</style>
