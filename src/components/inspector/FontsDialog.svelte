<script>
  import Button from '../ui/Button.svelte';
  import Dialog from '../ui/Dialog.svelte';
  import Field from '../ui/Field.svelte';
  import Select from '../ui/Select.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { fontFamily, fontUsage } from '../../lib/domain/fonts.js';
  import { BUILTIN_FONTS } from '../../lib/domain/elements.js';
  import { LIMITS } from '../../lib/domain/model.js';
  import {
    addCustomFont,
    removeCustomFont,
    session
  } from '../../lib/state/project.svelte.js';
  import { ensureProjectFonts } from '../../lib/state/fonts.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { open = $bindable(false) } = $props();

  let fileInput = $state(null);
  let file = $state(null);
  let name = $state('');
  let weight = $state('400');
  let style = $state('normal');
  let licenseNote = $state('');
  let busy = $state(false);
  let confirming = $state(null);

  const fonts = $derived(Object.values(session.project?.fonts ?? {}));
  const full = $derived(fonts.length >= LIMITS.fonts);

  $effect(() => {
    if (open && session.project) void ensureProjectFonts(session.project);
  });

  function chooseFile() {
    fileInput?.click();
  }

  function onFile(event) {
    const picked = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    file = picked;
    if (picked) {
      name = picked.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();
    }
  }

  async function add() {
    if (!file || busy || full) return;
    busy = true;
    try {
      await addCustomFont({
        file,
        name,
        weight: Number(weight),
        style,
        licenseNote
      });
      toast(t('fonts.added', { name }), 'success');
      file = null;
      name = '';
      licenseNote = '';
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      busy = false;
    }
  }

  async function remove(font) {
    if (busy) return;
    busy = true;
    try {
      await removeCustomFont(font.id);
      toast(t('fonts.deleted'), 'success');
      confirming = null;
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      busy = false;
    }
  }
</script>

<Dialog bind:open title={t('fonts.title')}>
  <section class="block">
    <span class="mono-label">{t('fonts.builtin')}</span>
    <div class="font-list">
      {#each BUILTIN_FONTS as font}
        <div class="font-row">
          <span class="preview" style:font-family={font.family}>Aa</span>
          <span class="font-name">{font.label}</span>
        </div>
      {/each}
    </div>
  </section>

  <section class="block">
    <span class="mono-label">{t('fonts.custom')}</span>
    {#if fonts.length === 0}
      <p class="hint">{t('fonts.empty')}</p>
    {:else}
      <div class="font-list">
        {#each fonts as font (font.id)}
          <div class="font-row">
            <span class="preview" style:font-family={`'${fontFamily(font)}', serif`}
              >Aa</span
            >
            <span class="font-name">
              {font.name}
              <small>{font.weight} · {font.style}</small>
            </span>
            <span class="usage"
              >{t('fonts.inUse', { count: fontUsage(session.project, font.id) })}</span
            >
            {#if confirming === font.id}
              <Button size="sm" variant="ghost" onclick={() => (confirming = null)}>
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onclick={() => remove(font)}
                disabled={busy}
              >
                {t('common.delete')}
              </Button>
            {:else}
              <Button
                size="sm"
                variant="danger"
                disabled={fontUsage(session.project, font.id) > 0}
                title={fontUsage(session.project, font.id) > 0
                  ? t('fonts.deleteInUse')
                  : undefined}
                onclick={() => (confirming = font.id)}
              >
                {t('fonts.delete')}
              </Button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="block add-block">
    <span class="mono-label">{t('fonts.add')}</span>
    {#if full}
      <p class="hint">{t('fonts.limit')}</p>
    {:else}
      <input
        bind:this={fileInput}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
        hidden
        onchange={onFile}
      />
      <div class="file-row">
        <Button size="sm" onclick={chooseFile} disabled={busy}>
          {t('fonts.file')}
        </Button>
        <span class="file-name">{file ? file.name : t('fonts.chooseFile')}</span>
      </div>
      <div class="field-grid">
        <Field label={t('fonts.name')} bind:value={name} />
        <Field label={t('fonts.weight')} type="number" bind:value={weight} />
      </div>
      <Select
        label={t('fonts.style')}
        bind:value={style}
        options={[
          { value: 'normal', label: t('fonts.normal') },
          { value: 'italic', label: t('fonts.italic') }
        ]}
      />
      <Field
        label={t('fonts.license')}
        hint={t('fonts.licenseHint')}
        bind:value={licenseNote}
      />
      <div class="actions">
        <Button variant="accent" size="sm" onclick={add} disabled={!file || busy}>
          {t('fonts.add')}
        </Button>
      </div>
    {/if}
  </section>
</Dialog>

<style>
  .block {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--line-soft);
  }

  .font-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .font-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 34px;
    padding: var(--space-1);
    background: var(--panel-2);
    border: 1px solid var(--line-soft);
  }

  .preview {
    display: grid;
    place-items: center;
    width: 34px;
    height: 30px;
    border: 1px solid var(--line-soft);
    font-size: var(--text-lg);
    line-height: 1;
  }

  .font-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: var(--text-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .font-name small {
    display: block;
    color: var(--muted);
    font-size: var(--text-3xs);
  }

  .usage {
    color: var(--muted);
    font-size: var(--text-3xs);
    white-space: nowrap;
  }

  .file-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .file-name {
    min-width: 0;
    overflow: hidden;
    color: var(--muted);
    font-size: var(--text-2xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .hint {
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }
</style>
