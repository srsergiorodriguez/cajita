<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Select from '../ui/Select.svelte';
  import ColorField from './ColorField.svelte';
  import Section from '../ui/Section.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { BUILTIN_FONTS } from '../../lib/domain/elements.js';
  import { colorForToken } from '../../lib/domain/design.js';
  import {
    resetPalette,
    session,
    setSiteBackground,
    updatePalette,
    updateRadiusToken,
    updateTextStyle
  } from '../../lib/state/project.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { open = $bindable(false) } = $props();
  const project = $derived(session.project);
  const fontOptions = $derived(BUILTIN_FONTS.map((font) => ({ value: font.id, label: font.label })));
  const colorOptions = $derived(
    (project?.colorTokens ?? []).map((token) => ({ value: token.id, label: token.name }))
  );
  const styles = $derived(Object.values(project?.textStyles ?? {}));

  function apply(action) {
    try {
      action();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }
</script>

<Dialog bind:open title={t('design.title')} wide>
  {#if project}
    <div class="design-system">
      <Section label={t('design.colors')}>
        <ColorField
          label={t('inspector.siteBackground')}
          value={project.siteBackground ?? '#fffdf7'}
          token={project.siteBackgroundToken}
          {project}
          onchange={({ value, token }) => apply(() => setSiteBackground(value, { token }))}
        />
        <div class="color-tokens">
          {#each project.colorTokens ?? [] as token (token.id)}
            <label class="color-token">
              <span>{token.name}</span>
              <input
                type="color"
                value={project.palette?.[token.index] ?? '#000000'}
                aria-label={token.name}
                oninput={(event) => apply(() => updatePalette(token.index, event.currentTarget.value))}
              />
            </label>
          {/each}
        </div>
        <Button size="sm" variant="ghost" onclick={() => apply(resetPalette)}>
          {t('palette.reset')}
        </Button>
      </Section>

      <Section label={t('design.textStyles')}>
        <div class="text-styles">
          {#each styles as style (style.id)}
            <div class="text-style">
              <div class="style-head">
                <strong>{style.name}</strong>
                <label class="check">
                  <input type="checkbox" checked={Boolean(style.heading)} onchange={(event) => apply(() => updateTextStyle(style.id, { heading: event.currentTarget.checked }))} />
                  <span>{t('design.heading')}</span>
                </label>
              </div>
              <div class="style-fields">
                <Select label={t('text.font')} value={style.font} options={fontOptions} onchange={(font) => apply(() => updateTextStyle(style.id, { font }))} />
                <Field label={t('text.size')} type="number" value={style.fontSize} suffix="px" onchange={(event) => apply(() => updateTextStyle(style.id, { fontSize: Number(event.currentTarget.value) }))} />
                <Field label={t('text.lineHeight')} type="number" value={style.lineHeight} onchange={(event) => apply(() => updateTextStyle(style.id, { lineHeight: Number(event.currentTarget.value) }))} />
                <Field label={t('text.letterSpacing')} type="number" value={style.letterSpacing} suffix="px" onchange={(event) => apply(() => updateTextStyle(style.id, { letterSpacing: Number(event.currentTarget.value) }))} />
                <Select label={t('text.color')} value={style.colorToken} options={colorOptions} onchange={(colorToken) => apply(() => updateTextStyle(style.id, { colorToken }))} />
              </div>
            </div>
          {/each}
        </div>
      </Section>

      <Section label={t('design.radii')}>
        <div class="radii">
          {#each project.radiusTokens ?? [] as token (token.id)}
            <Field
              label={token.name}
              type="number"
              value={token.value}
              suffix="%"
              onchange={(event) => apply(() => updateRadiusToken(token.id, Number(event.currentTarget.value)))}
            />
          {/each}
        </div>
      </Section>

      <Section label={t('design.preview')}>
        <div class="preview" style:background={colorForToken(project, 'background')} style:color={colorForToken(project, 'text')}>
          <strong style:font-family={styles[0]?.font}>{styles[0]?.name}</strong>
          <span>{styles.at(-1)?.name}</span>
        </div>
      </Section>
    </div>
  {/if}
</Dialog>

<style>
  .design-system { display: flex; flex-direction: column; gap: var(--space-2); }
  .color-tokens { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-2); }
  .color-token { display: flex; flex-direction: column; gap: 3px; min-width: 0; color: var(--muted); font-size: var(--text-2xs); }
  .color-token input { width: 100%; height: 32px; padding: 2px; border: 1px solid var(--line); background: var(--panel-2); }
  .text-styles { display: flex; flex-direction: column; gap: var(--space-2); }
  .text-style { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-2); border: 1px solid var(--line-soft); }
  .style-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
  .style-head strong { font-size: var(--text-sm); }
  .style-fields { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-2); }
  .radii { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-2); }
  .preview { display: flex; flex-direction: column; gap: 4px; padding: var(--space-4); }
  .preview strong { font-size: 28px; }
  .preview span { font-size: 14px; }
</style>
