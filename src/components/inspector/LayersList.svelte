<script>
  import { tick } from 'svelte';
  import Icon from '../ui/Icon.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { elementName } from '../../lib/domain/elements.js';
  import {
    reorderLayers,
    selectElement,
    session,
    updateElement
  } from '../../lib/state/project.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';

  let { page } = $props();

  let draggingId = $state(null);
  let dropIndex = $state(-1);
  let renamingId = $state(null);
  let nameDraft = $state('');
  let nameInput = $state(null);

  const layers = $derived(
    [...(page?.elements ?? [])].sort((a, b) => (b.z ?? 0) - (a.z ?? 0))
  );

  function iconFor(element) {
    if (element.type === 'text') return 'text';
    if (element.type === 'image') return 'image';
    if (element.type === 'video') return 'video';
    if (element.type === 'shape') return 'shape';
    if (element.type === 'ficha') return 'archive';
    if (element.type === 'embed')
      return element.provider === 'observable' ? 'chart' : 'play';
    return 'sound';
  }

  function apply(action) {
    try {
      action();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function toggleLayer(element, key) {
    apply(() => updateElement(element.id, { [key]: !element[key] }));
  }

  async function beginRename(element) {
    renamingId = element.id;
    nameDraft = element.name ?? '';
    await tick();
    nameInput?.focus();
    nameInput?.select();
  }

  function commitRename() {
    if (!renamingId) return;
    const id = renamingId;
    const nextName = nameDraft.trim();
    renamingId = null;
    apply(() => updateElement(id, { name: nextName }));
  }

  function cancelRename() {
    renamingId = null;
  }

  function startDrag(event, element) {
    if (renamingId === element.id || event.target.closest('.layer-control')) {
      event.preventDefault();
      return;
    }
    draggingId = element.id;
    dropIndex = layers.findIndex((item) => item.id === element.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', element.id);
  }

  function dragOverList(event) {
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const rows = [...event.currentTarget.querySelectorAll('.layer')];
    const at = rows.findIndex((row) => {
      const rect = row.getBoundingClientRect();
      return event.clientY < rect.top + rect.height / 2;
    });
    dropIndex = at < 0 ? rows.length : at;
  }

  function finishDrag() {
    draggingId = null;
    dropIndex = -1;
  }

  function drop(event) {
    event.preventDefault();
    if (!draggingId) return;
    const rows = [...event.currentTarget.querySelectorAll('.layer')];
    const at = rows.findIndex((row) => {
      const rect = row.getBoundingClientRect();
      return event.clientY < rect.top + rect.height / 2;
    });
    const insertAt = at < 0 ? rows.length : at;
    const ids = layers.map((item) => item.id);
    const from = ids.indexOf(draggingId);
    if (from < 0) {
      finishDrag();
      return;
    }
    ids.splice(from, 1);
    let insert = insertAt;
    if (from < insert) insert -= 1;
    insert = Math.max(0, Math.min(ids.length, insert));
    ids.splice(insert, 0, draggingId);
    apply(() => reorderLayers(ids));
    finishDrag();
  }
</script>

<div class="layers" role="list" ondragover={dragOverList} ondrop={drop}>
  {#if layers.length === 0}
    <p class="empty">{t('layers.empty')}</p>
  {:else}
    {#each layers as element, index (element.id)}
      {#if draggingId && dropIndex === index}
        <div class="drop-line" aria-hidden="true"></div>
      {/if}
      <div
        class="layer"
        role="listitem"
        class:active={session.selectedElementIds.includes(element.id)}
        class:dragging={draggingId === element.id}
        draggable={renamingId !== element.id}
        ondragstart={(event) => startDrag(event, element)}
        ondragend={finishDrag}
      >
        {#if renamingId === element.id}
          <div class="layer-main layer-main--editing">
            <Icon name={iconFor(element)} size={13} />
            <input
              bind:this={nameInput}
              bind:value={nameDraft}
              class="layer-name-input"
              aria-label={t('layers.rename')}
              maxlength="80"
              onkeydown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitRename();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelRename();
                }
              }}
              onblur={commitRename}
            />
          </div>
        {:else}
          <button
            type="button"
            class="layer-main"
            title={t('layers.renameHint')}
            onclick={() => selectElement(element.id, { additive: false })}
            ondblclick={(event) => {
              event.stopPropagation();
              void beginRename(element);
            }}
          >
            <Icon name="grip" size={12} />
            <Icon name={iconFor(element)} size={13} />
            <span class="layer-name">{elementName(element, layers.length - index)}</span>
          </button>
        {/if}
        <button
          type="button"
          class="layer-control"
          class:active={element.locked}
          aria-label={element.locked ? t('element.unlock') : t('element.lock')}
          title={element.locked ? t('element.unlock') : t('element.lock')}
          onclick={(event) => {
            event.stopPropagation();
            toggleLayer(element, 'locked');
          }}
        >
          <Icon name="lock" size={12} />
        </button>
        <button
          type="button"
          class="layer-control"
          class:active={element.hidden}
          aria-label={element.hidden ? t('element.show') : t('element.hide')}
          title={element.hidden ? t('element.show') : t('element.hide')}
          onclick={(event) => {
            event.stopPropagation();
            toggleLayer(element, 'hidden');
          }}
        >
          <Icon name="eye" size={12} />
        </button>
      </div>
    {/each}
    {#if draggingId && dropIndex === layers.length}
      <div class="drop-line" aria-hidden="true"></div>
    {/if}
  {/if}
</div>

<style>
  .layers {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .layer {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid transparent;
    background: var(--panel-2);
    cursor: grab;
  }

  .layer:active {
    cursor: grabbing;
  }

  .layer.dragging {
    opacity: 0.45;
  }

  .layer.active {
    border-color: var(--selection);
    background: var(--active-wash);
  }

  .layer-main {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
    min-height: 30px;
    padding: 0 var(--space-1);
    border: 0;
    background: transparent;
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    text-align: left;
    cursor: inherit;
  }

  .layer-main--editing {
    cursor: text;
  }

  .layer-main :global(svg:first-child) {
    color: var(--muted);
  }

  .layer-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .layer-name-input {
    flex: 1;
    min-width: 0;
    height: 24px;
    padding: 0 4px;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    outline: none;
  }

  .layer-name-input:focus {
    outline: 2px solid var(--focus);
    outline-offset: 0;
  }

  .layer-control {
    display: grid;
    place-items: center;
    width: 24px;
    height: 28px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }

  .layer-control:hover {
    background: var(--panel-3);
    color: var(--ink);
  }

  .layer-control.active {
    color: var(--accent);
  }

  .drop-line {
    height: 2px;
    margin: 1px 0;
    background: var(--selection);
    pointer-events: none;
  }

  .empty {
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
</style>
