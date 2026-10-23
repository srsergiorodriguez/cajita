<script>
  import Icon from '../ui/Icon.svelte';
  import IconButton from '../ui/IconButton.svelte';
  import EmbedDialog from '../embed/EmbedDialog.svelte';
  import FichasDialog from '../ficha/FichasDialog.svelte';
  import {
    addElement,
    importMedia,
    session
  } from '../../lib/state/project.svelte.js';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { platform } from '../../lib/platform/index.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import { toggleCollapsed } from '../../lib/state/preferences.svelte.js';

  let embedOpen = $state(false);
  let embedProvider = $state('youtube');
  let shapeOpen = $state(false);
  let fichasOpen = $state(false);

  const MEDIA_ACCEPT = {
    image: 'image/png,image/jpeg,image/gif,image/webp',
    video: 'video/mp4,video/webm',
    audio: 'audio/mpeg,audio/ogg,audio/wav,audio/mp4'
  };

  async function addMedia(kind) {
    if (!session.project || session.lockConflict) return;
    try {
      const files = await platform.files.pickFiles({
        accept: MEDIA_ACCEPT[kind],
        multiple: false
      });
      if (!files.length) return;
      const result = await importMedia(files);
      const asset = [...result.addedAssets, ...result.skippedAssets].find(
        (item) => item.kind === kind
      );
      if (!asset) {
        for (const error of result.errors) toast(error, 'error');
        return;
      }
      addElement(kind, { assetId: asset.id });
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function addImage() {
    return addMedia('image');
  }

  function addVideo() {
    return addMedia('video');
  }

  function addSound() {
    return addMedia('audio');
  }

  function addText() {
    try {
      addElement('text', { text: t('text.new') });
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function openEmbed(provider) {
    embedProvider = provider;
    embedOpen = true;
  }

  function addShape(kind) {
    addElement('shape', {
      shape: kind,
      fill: session.project?.theme?.accent ?? '#a82a1e',
      stroke: session.project?.theme?.ink ?? '#1c1917',
      strokeWidth: 0
    });
    shapeOpen = false;
  }

  function closeShapePicker(event) {
    if (!event.target.closest('.shape-picker, .shape-tool')) shapeOpen = false;
  }

  const tools = [
    { icon: 'image', label: 'left.image', action: addImage },
    { icon: 'text', label: 'left.text', action: addText },
    { icon: 'video', label: 'left.video', action: addVideo },
    { icon: 'sound', label: 'left.sound', action: addSound },
    { icon: 'play', label: 'embed.youtube', action: () => openEmbed('youtube') },
    { icon: 'chart', label: 'embed.observable', action: () => openEmbed('observable') },
    { icon: 'code', label: 'embed.p5', action: () => openEmbed('p5') },
    { icon: 'shape', label: 'shape.tool', action: () => (shapeOpen = !shapeOpen) },
    { icon: 'archive', label: 'ficha.tool', action: () => (fichasOpen = true) }
  ];
</script>

<aside class="left-panel" aria-label={t('left.add')}>
  <div class="panel-head">
    <span class="mono-label">{t('left.add')}</span>
    <IconButton
      label={t('top.collapsePages')}
      icon="chevron-left"
      size={24}
      iconSize={12}
      variant="ghost"
      onclick={() => toggleCollapsed('left')}
    />
  </div>

  <section class="panel-section">
    <div class="tools">
      {#each tools as tool}
        <button
          class="tool"
          class:shape-tool={tool.icon === 'shape'}
          type="button"
          disabled={tool.disabled}
          title={tool.disabled ? t('top.soon') : t(tool.label)}
          onclick={tool.action}
          aria-expanded={tool.icon === 'shape' ? shapeOpen : undefined}
        >
          <Icon name={tool.icon} size={14} />
          <span>{t(tool.label)}</span>
        </button>
      {/each}
    </div>
    {#if shapeOpen}
      <div class="shape-picker" role="menu" aria-label={t('shape.tool')}>
        {#each [['circle', 'shape.circle'], ['square', 'shape.square'], ['triangle', 'shape.triangle']] as [kind, label] (kind)}
          <button
            type="button"
            class="shape-choice"
            role="menuitem"
            onclick={() => addShape(kind)}
          >
            <span
              class="shape-glyph"
              class:shape-glyph--circle={kind === 'circle'}
              class:shape-glyph--triangle={kind === 'triangle'}
            ></span>
            <span>{t(label)}</span>
          </button>
        {/each}
      </div>
    {/if}
  </section>

  <EmbedDialog bind:open={embedOpen} provider={embedProvider} />
  <FichasDialog bind:open={fichasOpen} />
</aside>
<svelte:window onpointerdown={closeShapePicker} />

<style>
  .left-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--panel);
    border-right: var(--border-control) solid var(--line);
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4) var(--space-2);
    border-bottom: 1px solid var(--line-soft);
  }

  .panel-section {
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--line-soft);
  }

  .tools {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .tool {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 34px;
    padding: 0 var(--space-2);
    border: var(--border-control) solid var(--line);
    border-radius: 0;
    background: var(--panel-2);
    box-shadow: var(--shadow-btn);
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    text-align: left;
  }

  .tool:disabled {
    cursor: not-allowed;
    border-style: dotted;
    box-shadow: none;
    opacity: 0.55;
  }

  .shape-picker {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px solid var(--line);
    background: var(--panel-2);
  }

  .shape-choice {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: var(--space-2) 2px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-3xs);
    cursor: pointer;
  }

  .shape-choice:hover {
    border-color: var(--line);
    background: var(--panel-3);
  }

  .shape-glyph {
    display: block;
    width: 22px;
    height: 22px;
    background: var(--ink);
  }

  .shape-glyph--circle {
    border-radius: 50%;
  }

  .shape-glyph--triangle {
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
</style>
