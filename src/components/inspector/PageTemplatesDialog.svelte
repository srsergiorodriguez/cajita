<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Icon from '../ui/Icon.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import {
    applyPageTemplate,
    deletePageTemplate,
    savePageTemplate,
    session
  } from '../../lib/state/project.svelte.js';

  let { open = $bindable(false), page } = $props();
  let name = $state('');
  let error = $state('');

  const templates = $derived(Object.values(session.project?.pageTemplates ?? {}));

  function create() {
    error = '';
    try {
      const template = savePageTemplate(name);
      if (template) name = '';
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function apply(template) {
    error = '';
    try {
      applyPageTemplate(template.id, page.id);
      toast(t('templates.applied', { name: template.name }), 'success');
      open = false;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function remove(template) {
    if (!window.confirm(t('templates.deleteConfirm', { name: template.name }))) return;
    try {
      deletePageTemplate(template.id);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function gridName(id) {
    return session.project?.grids?.[id]?.name ?? '';
  }
</script>

<Dialog bind:open title={t('templates.title')} wide>
  <div class="templates">
    <section class="create">
      <span class="mono-label">{t('templates.saveCurrent')}</span>
      <p class="hint">{t('templates.saveHint')}</p>
      <div class="create-row">
        <Field
          label={t('templates.name')}
          value={name}
          placeholder={t('templates.namePlaceholder')}
          oninput={(event) => (name = event.currentTarget.value)}
        />
        <Button size="sm" variant="secondary" onclick={create}>
          <Icon name="plus" size={12} />{t('templates.save')}
        </Button>
      </div>
      {#if error}<p class="error">{error}</p>{/if}
    </section>

    <section class="list">
      <span class="mono-label">{t('templates.list', { count: templates.length })}</span>
      {#if templates.length === 0}
        <p class="hint">{t('templates.empty')}</p>
      {:else}
        {#each templates as template (template.id)}
          <article class="template">
            <div class="template-main">
              <strong>{template.name}</strong>
              <span class="template-meta">
                {t('templates.elements', { count: template.elements?.length ?? 0 })}
                {#if template.gridId}· {gridName(template.gridId)}{/if}
              </span>
            </div>
            <div class="template-actions">
              <Button size="sm" variant="secondary" onclick={() => apply(template)}>
                {t('templates.apply')}
              </Button>
              <Button size="sm" variant="danger" onclick={() => remove(template)}>
                <Icon name="trash" size={12} />
              </Button>
            </div>
          </article>
        {/each}
      {/if}
      <p class="hint">{t('templates.appendHint')}</p>
    </section>
  </div>
</Dialog>

<style>
  .templates {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  .create,
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .create-row {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
  }
  .create-row :global(.field) {
    flex: 1;
  }
  .template {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2);
    border: 1px solid var(--line);
    background: var(--panel-2);
  }
  .template-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .template-main strong {
    font-size: var(--text-sm);
  }
  .template-meta {
    color: var(--muted);
    font-size: var(--text-2xs);
  }
  .template-actions {
    display: flex;
    gap: var(--space-1);
  }
  .hint,
  .error {
    margin: 0;
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
  .error {
    color: var(--danger);
  }
</style>
