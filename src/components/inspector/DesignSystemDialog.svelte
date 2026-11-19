<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Select from '../ui/Select.svelte';
  import ColorField from './ColorField.svelte';
  import IconButton from '../ui/IconButton.svelte';
  import Section from '../ui/Section.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { BUILTIN_FONTS, fontStack } from '../../lib/domain/elements.js';
  import { generatePalette } from '../../lib/domain/palette-generator.js';
  import { colorForToken } from '../../lib/domain/design.js';
  import { contrastRatio } from '../../lib/domain/palette-generator.js';
  import {
    applyGeneratedPalette,
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
  let locked = $state(new Set());
  const samples = {
    'heading-1': 'Una cajita',
    'heading-2': 'para ideas pequeñas',
    'heading-3': 'claro, portable, tuyo.',
    body: 'Un sitio hipermedial hecho de páginas, imágenes, texto y sonido.'
  };
  const textColor = $derived(colorForToken(project, 'text'));
  const background = $derived(project?.siteBackground ?? colorForToken(project, 'background'));
  const contrast = $derived(contrastRatio(textColor, background));

  function toggleLock(index) {
    const next = new Set(locked);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    locked = next;
  }

  function generate() {
    const colors = generatePalette({ project, locked: [...locked] });
    apply(() => applyGeneratedPalette(colors));
  }

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
      <div class="controls">
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
            <div class="color-token">
              <div class="token-head">
                <span>{token.name}</span>
                <IconButton
                  label={locked.has(token.index) ? t('design.unlock') : t('design.lock')}
                  icon="lock"
                  size={20}
                  iconSize={11}
                  variant={locked.has(token.index) ? 'default' : 'ghost'}
                  onclick={() => toggleLock(token.index)}
                />
              </div>
              <input
                type="color"
                value={project.palette?.[token.index] ?? '#000000'}
                aria-label={token.name}
                oninput={(event) => apply(() => updatePalette(token.index, event.currentTarget.value))}
              />
            </div>
          {/each}
        </div>
        <div class="palette-actions">
          <Button size="sm" variant="accent" onclick={generate}>{t('design.generate')}</Button>
          <Button size="sm" variant="ghost" onclick={() => apply(resetPalette)}>
            {t('palette.reset')}
          </Button>
        </div>
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
                <Field label={t('text.size')} type="number" value={style.fontSize} suffix="px" oninput={(event) => apply(() => updateTextStyle(style.id, { fontSize: Number(event.currentTarget.value) }, { coalesceKey: `textStyle:${style.id}:size` }))} />
                <Field label={t('text.lineHeight')} type="number" value={style.lineHeight} oninput={(event) => apply(() => updateTextStyle(style.id, { lineHeight: Number(event.currentTarget.value) }, { coalesceKey: `textStyle:${style.id}:line` }))} />
                <Field label={t('text.letterSpacing')} type="number" value={style.letterSpacing} suffix="px" oninput={(event) => apply(() => updateTextStyle(style.id, { letterSpacing: Number(event.currentTarget.value) }, { coalesceKey: `textStyle:${style.id}:spacing` }))} />
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
              oninput={(event) => apply(() => updateRadiusToken(token.id, Number(event.currentTarget.value)))}
            />
          {/each}
        </div>
      </Section>

      </div>

      <aside class="preview-panel">
        <div class="preview-head">
          <span class="mono-label">{t('design.preview')}</span>
          <span class="contrast">{contrast.toFixed(1)}:1</span>
        </div>
        <div class="preview-page" style:background style:color={textColor}>
          <span class="preview-kicker">CAJITA · SISTEMA</span>
          {#each styles as style (style.id)}
            <div class="preview-line">
              <span class="preview-label">{style.name}</span>
              <span
                class="preview-sample"
                style={`font-family:${fontStack(project, style.font)};font-size:${style.fontSize}px;font-weight:${style.heading ? 700 : 400};line-height:${style.lineHeight};letter-spacing:${style.letterSpacing}px;color:${colorForToken(project, style.colorToken)}`}
              >{samples[style.id] ?? style.name}</span>
            </div>
          {/each}
          <div class="preview-swatches">
            {#each project.colorTokens ?? [] as token (token.id)}
              <span title={token.name} style:background={project.palette?.[token.index]}></span>
            {/each}
          </div>
          <div class="preview-radii">
            {#each project.radiusTokens ?? [] as token (token.id)}
              <span title={token.name} style={`background:${colorForToken(project, 'accent')};border-radius:${token.value}%`}></span>
            {/each}
          </div>
        </div>
      </aside>
    </div>
  {/if}
</Dialog>

<style>
  .design-system { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: var(--space-3); align-items: start; }
  .controls { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
  .preview-panel { position: sticky; top: 0; display: flex; flex-direction: column; gap: var(--space-2); }
  .preview-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
  .contrast { color: var(--muted); font-family: var(--font-mono); font-size: var(--text-3xs); }
  .preview-page { display: flex; flex-direction: column; gap: var(--space-3); min-height: 390px; padding: var(--space-4); border: 1px solid var(--line); }
  .preview-kicker { color: var(--muted); font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.08em; }
  .preview-line { display: flex; flex-direction: column; gap: 2px; }
  .preview-label { color: var(--muted); font-family: var(--font-mono); font-size: 8px; text-transform: uppercase; }
  .preview-sample { display: block; overflow-wrap: anywhere; }
  .preview-swatches { display: flex; gap: 3px; margin-top: auto; }
  .preview-swatches span { width: 18px; height: 18px; border: 1px solid currentColor; }
  .preview-radii { display: flex; gap: 4px; }
  .preview-radii span { width: 22px; height: 22px; background: var(--accent); }
  @media (max-width: 900px) {
    .design-system { grid-template-columns: 1fr; }
    .preview-panel { position: static; order: -1; }
  }
  .color-tokens { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-2); }
  .color-token { display: flex; flex-direction: column; gap: 3px; min-width: 0; color: var(--muted); font-size: var(--text-2xs); }
  .token-head { display: flex; align-items: center; justify-content: space-between; gap: 1px; }
  .palette-actions { display: flex; gap: var(--space-2); }
  .color-token input { width: 100%; height: 32px; padding: 2px; border: 1px solid var(--line); background: var(--panel-2); }
  .text-styles { display: flex; flex-direction: column; gap: var(--space-2); }
  .text-style { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-2); border: 1px solid var(--line-soft); }
  .style-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
  .style-head strong { font-size: var(--text-sm); }
  .style-fields { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-2); }
  .radii { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-2); }
</style>
