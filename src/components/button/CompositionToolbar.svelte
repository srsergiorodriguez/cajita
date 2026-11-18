<script>
  import IconButton from '../ui/IconButton.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import StudioToolbar from '../studio/StudioToolbar.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';

  let {
    composition,
    activeFrameId,
    isButton,
    frameLimit,
    frameDuration,
    previewing,
    onion,
    onionScope,
    onadd,
    onduplicate,
    onmove,
    onremove,
    ontogglepreview,
    ontoggleonion,
    onscope,
    onduration
  } = $props();
</script>

<StudioToolbar>
  {#snippet actions()}
    {#if !isButton}
      <span class="frame-count">{composition.frames.length}/{frameLimit}</span>
      <IconButton label={t('composition.addFrame')} icon="plus" size={24} iconSize={12} variant="ghost" disabled={composition.frames.length >= frameLimit} onclick={onadd} />
      <IconButton label={t('composition.duplicateFrame')} icon="duplicate" size={24} iconSize={12} variant="ghost" disabled={composition.frames.length >= frameLimit} onclick={onduplicate} />
      <IconButton label={t('composition.moveFrameLeft')} icon="chevron-left" size={24} iconSize={12} variant="ghost" disabled={composition.frames.findIndex((frame) => frame.id === activeFrameId) <= 0} onclick={() => onmove(-1)} />
      <IconButton label={t('composition.moveFrameRight')} icon="chevron-right" size={24} iconSize={12} variant="ghost" disabled={composition.frames.findIndex((frame) => frame.id === activeFrameId) >= composition.frames.length - 1} onclick={() => onmove(1)} />
      <IconButton label={t('common.delete')} icon="trash" size={24} iconSize={12} variant="ghost" disabled={composition.frames.length < 2} onclick={onremove} />
    {/if}
    {#if composition.preset === 'animation'}
      <label class="duration-field">
        <span>{t('composition.duration')}</span>
        <input
          type="number"
          min="50"
          max="10000"
          step="10"
          value={frameDuration}
          onchange={(event) => onduration(event.currentTarget.value)}
        />
        <span>ms</span>
      </label>
    {/if}
    <IconButton
      label={previewing ? t('composition.backToEdit') : t('composition.preview')}
      icon={previewing ? 'pause' : 'play'}
      size={24}
      iconSize={12}
      variant={previewing ? 'default' : 'ghost'}
      onclick={ontogglepreview}
    />
    {#if composition.frames.length > 1}
      <IconButton
        label={t('composition.onion')}
        icon="onion"
        size={24}
        iconSize={12}
        variant={onion ? 'default' : 'ghost'}
        onclick={ontoggleonion}
      />
      {#if onion}
        <SegmentedControl
          label={t('composition.onionScope')}
          value={onionScope}
          options={[
            { value: 'all', label: t('composition.onionAll') },
            { value: 'drawings', label: t('composition.onionDrawings') }
          ]}
          onchange={onscope}
        />
      {/if}
    {/if}
  {/snippet}
</StudioToolbar>

<style>
  .frame-count { color: var(--muted); font-family: var(--font-ui); font-size: var(--text-2xs); font-variant-numeric: tabular-nums; }
  .duration-field { display: inline-flex; align-items: center; gap: 3px; color: var(--muted); font-family: var(--font-ui); font-size: var(--text-2xs); }
  .duration-field input { width: 66px; height: 24px; padding: 0 4px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font: inherit; text-align: right; }
</style>
