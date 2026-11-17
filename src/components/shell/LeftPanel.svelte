<script>
  import Icon from '../ui/Icon.svelte';
  import IconButton from '../ui/IconButton.svelte';
  import EmbedDialog from '../embed/EmbedDialog.svelte';
  import {
    addElement,
    importHtmlFile,
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
  let drawingOpen = $state(false);
  let compositionOpen = $state(false);
  let compositionPreset = $state('button');
  let htmlBusy = $state(false);

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

  async function addHtml() {
    if (!session.project || htmlBusy) return;
    htmlBusy = true;
    try {
      const files = await platform.files.pickFiles({
        accept: '.html,text/html',
        multiple: false
      });
      if (!files.length) return;
      if (!window.confirm(t('html.security'))) return;
      await importHtmlFile(files[0]);
      toast(t('html.imported'), 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      htmlBusy = false;
    }
  }

  const toolGroups = [
    {
      id: 'basics',
      label: 'left.group.basics',
      tools: [
        { icon: 'text', label: 'left.text', action: addText },
        { icon: 'image', label: 'left.image', action: addImage },
        { icon: 'shape', label: 'shape.tool', action: () => (shapeOpen = !shapeOpen), shape: true },
        { icon: 'pencil', label: 'drawing.tool', action: () => (drawingOpen = true) }
      ]
    },
    {
      id: 'media',
      label: 'left.group.media',
      tools: [
        { icon: 'video', label: 'left.video', action: addVideo },
        { icon: 'sound', label: 'left.sound', action: addSound }
      ]
    },
    {
      id: 'interaction',
      label: 'left.group.interaction',
      tools: [
        { icon: 'button', label: 'composition.button', action: () => { compositionPreset = 'button'; compositionOpen = true; } },
        { icon: 'play', label: 'composition.animation', action: () => { compositionPreset = 'animation'; compositionOpen = true; } }
      ]
    },
    {
      id: 'insert',
      label: 'left.group.insert',
      tools: [
        { icon: 'play', label: 'embed.youtube', action: () => openEmbed('youtube') },
        { icon: 'chart', label: 'embed.observable', action: () => openEmbed('observable') },
        { icon: 'code', label: 'embed.p5', action: () => openEmbed('p5') },
        { icon: 'html', label: 'html.tool', action: addHtml }
      ]
    },
    {
      id: 'data',
      label: 'left.group.data',
      tools: [{ icon: 'archive', label: 'ficha.tool', action: () => (fichasOpen = true) }]
    }
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
    {#each toolGroups as group (group.id)}
      <div class="tool-group" class:tool-group--first={group.id === 'basics'}>
        <span class="group-label">{t(group.label)}</span>
        <div class="tools">
          {#each group.tools as tool}
            <button
              class="tool"
              type="button"
              title={t(tool.label)}
              onclick={tool.action}
              aria-expanded={tool.shape ? shapeOpen : undefined}
            >
              <Icon name={tool.icon} size={14} />
              <span>{t(tool.label)}</span>
            </button>
          {/each}
        </div>
        {#if group.id === 'basics' && shapeOpen}
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
      </div>
    {/each}
  </section>

  <EmbedDialog bind:open={embedOpen} provider={embedProvider} />
  {#if fichasOpen}
    {#await import('../ficha/FichasDialog.svelte') then { default: FichasDialog }}
      <FichasDialog bind:open={fichasOpen} />
    {/await}
  {/if}
  {#if drawingOpen}
    {#await import('../drawing/DrawingDialog.svelte') then { default: DrawingDialog }}
      <DrawingDialog bind:open={drawingOpen} />
    {/await}
  {/if}
  {#if compositionOpen}
    {#await import('../button/CompositionStudio.svelte') then { default: CompositionStudio }}
      <CompositionStudio bind:open={compositionOpen} preset={compositionPreset} />
    {/await}
  {/if}
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
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--line-soft);
  }

  .tool-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .tool-group--first {
    margin-top: 0;
  }

  .group-label {
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-3xs);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .tools {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-2);
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
