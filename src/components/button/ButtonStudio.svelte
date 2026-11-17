<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Select from '../ui/Select.svelte';
  import Icon from '../ui/Icon.svelte';
  import ButtonComposition from '../canvas/ButtonComposition.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import { addElement, session, updateElement } from '../../lib/state/project.svelte.js';
  import {
    BUTTON_STATES,
    createButtonChild,
    normaliseButton
  } from '../../lib/domain/button.js';
  import { defaultFrame } from '../../lib/domain/elements.js';

  let { open = $bindable(false), element = null } = $props();
  let button = $state({ states: { idle: [], hover: [], pressed: [] } });
  let state = $state('idle');
  let selectedId = $state(null);
  let stageEl = $state(null);
  let drag = null;
  let saving = $state(false);

  const project = $derived(session.project);
  const imageAssets = $derived(
    Object.values(project?.assets ?? {}).filter((asset) => asset.kind === 'image')
  );
  const drawings = $derived(Object.values(project?.drawings ?? {}));
  const imageOptions = $derived([
    { value: '', label: t('button.chooseImage') },
    ...imageAssets.map((asset) => ({ value: asset.id, label: asset.name }))
  ]);
  const drawingOptions = $derived([
    { value: '', label: t('button.chooseDrawing') },
    ...drawings.map((drawing) => ({ value: drawing.id, label: drawing.id.slice(0, 12) }))
  ]);
  let chosenImage = $state('');
  let chosenDrawing = $state('');

  const children = $derived(button.states[state] ?? []);
  const selected = $derived(children.find((child) => child.id === selectedId) ?? null);
  const aspect = $derived(
    element?.frame ? element.frame.w / element.frame.h : 320 / 96
  );

  function starter() {
    const idle = [
      createButtonChild('shape', {
        frame: { x: 0, y: 0, w: 100, h: 100 },
        shape: 'square',
        fill: project?.palette?.[2] ?? '#a82a1e',
        stroke: project?.palette?.[1] ?? '#1c1917',
        strokeWidth: 0,
        radius: 8
      }),
      createButtonChild('text', {
        frame: { x: 8, y: 18, w: 84, h: 64 },
        text: t('button.defaultLabel'),
        font: 'space-mono',
        fontSize: 7,
        color: '#fffdf7',
        align: 'center'
      })
    ];
    return { states: { idle, hover: [], pressed: [] } };
  }

  $effect(() => {
    if (!open) return;
    button = element?.button ? normaliseButton(element.button) : starter();
    state = 'idle';
    selectedId = null;
    drag = null;
    saving = false;
    chosenImage = '';
    chosenDrawing = '';
  });

  function addChild(type) {
    if (type === 'image' && !chosenImage) {
      toast(t('button.pickImageFirst'), 'info');
      return;
    }
    if (type === 'drawing' && !chosenDrawing) {
      toast(t('button.pickDrawingFirst'), 'info');
      return;
    }
    const child =
      type === 'image'
        ? createButtonChild('image', {
            assetId: chosenImage,
            alt: imageAssets.find((asset) => asset.id === chosenImage)?.name ?? '',
            frame: { x: 20, y: 20, w: 60, h: 60 }
          })
        : type === 'drawing'
          ? createButtonChild('drawing', {
              assetId: drawings.find((drawing) => drawing.id === chosenDrawing)?.assetId ?? '',
              drawingId: chosenDrawing,
              frame: { x: 20, y: 20, w: 60, h: 60 }
            })
          : type === 'shape'
            ? createButtonChild('shape', {
                frame: { x: 20, y: 20, w: 60, h: 60 },
                shape: 'square',
                fill: project?.palette?.[2] ?? '#a82a1e',
                stroke: project?.palette?.[1] ?? '#1c1917',
                strokeWidth: 0,
                radius: 12
              })
            : createButtonChild('text', {
                frame: { x: 15, y: 25, w: 70, h: 50 },
                text: t('button.defaultLabel'),
                font: 'space-mono',
                fontSize: 7,
                color: project?.palette?.[1] ?? '#1c1917',
                align: 'center'
              });
    button = {
      ...button,
      states: { ...button.states, [state]: [...children, child] }
    };
    selectedId = child.id;
  }

  function updateSelected(patch) {
    if (!selected) return;
    button = {
      ...button,
      states: {
        ...button.states,
        [state]: children.map((child) =>
          child.id === selected.id ? { ...child, ...patch } : child
        )
      }
    };
  }

  function updateFrame(key, value) {
    if (!selected) return;
    updateSelected({ frame: { ...selected.frame, [key]: Number(value) } });
  }

  function removeSelected() {
    if (!selected) return;
    button = {
      ...button,
      states: {
        ...button.states,
        [state]: children.filter((child) => child.id !== selected.id)
      }
    };
    selectedId = null;
  }

  function copyState() {
    const target = state === 'idle' ? 'hover' : 'idle';
    button = {
      ...button,
      states: {
        ...button.states,
        [target]: structuredClone($state.snapshot(children))
      }
    };
    toast(t('button.stateCopied', { state: target }), 'success');
  }

  function startDrag(childId, event) {
    selectedId = childId;
    const child = children.find((item) => item.id === childId);
    if (!child || !stageEl) return;
    drag = {
      id: childId,
      startX: event.clientX,
      startY: event.clientY,
      x: child.frame.x,
      y: child.frame.y,
      w: child.frame.w,
      h: child.frame.h
    };
  }

  function moveDrag(event) {
    if (!drag || !stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const child = children.find((item) => item.id === drag.id);
    if (!child) return;
    const dx = ((event.clientX - drag.startX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startY) / rect.height) * 100;
    updateSelected({
      frame: {
        ...child.frame,
        x: Math.max(0, Math.min(100 - child.frame.w, drag.x + dx)),
        y: Math.max(0, Math.min(100 - child.frame.h, drag.y + dy))
      }
    });
  }

  function endDrag() {
    drag = null;
  }

  function save() {
    if (saving) return;
    saving = true;
    try {
      const data = normaliseButton($state.snapshot(button));
      if (element) {
        updateElement(element.id, {
          button: data,
          label: element.label || t('button.defaultLabel')
        });
      } else {
        addElement('button', { button: data, buttonLabel: t('button.defaultLabel') });
      }
      open = false;
      saving = false;
      toast(t('button.saved'), 'success');
    } catch (error) {
      saving = false;
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }
</script>

<svelte:window onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag} />

<Dialog bind:open title={element ? t('button.edit') : t('button.title')} wide>
  <div class="button-studio">
    <div class="button-main">
      <div class="state-tabs">
        {#each BUTTON_STATES as stateName (stateName)}
          <button
            type="button"
            class:active={state === stateName}
            onclick={() => {
              state = stateName;
              selectedId = null;
            }}
          >
            {t(`button.state.${stateName}`)}
            <span>{button.states[stateName]?.length ?? 0}</span>
          </button>
        {/each}
      </div>
      <button
        type="button"
        class="button-stage"
        style:aspect-ratio={aspect}
        bind:this={stageEl}
        onclick={(event) => {
          if (event.target === event.currentTarget) selectedId = null;
        }}
        aria-label={t('button.canvas')}
      >
        <ButtonComposition
          {project}
          {button}
          {state}
          fallback={false}
          {selectedId}
          editable
          onselect={startDrag}
        />
      </button>
      <p class="hint">{t('button.hint')}</p>
    </div>

    <aside class="button-controls">
      <section>
        <span class="mono-label">{t('button.add')}</span>
        <div class="add-grid">
          <Button size="sm" variant="secondary" onclick={() => addChild('text')}>
            <Icon name="text" size={12} />{t('button.text')}
          </Button>
          <Button size="sm" variant="secondary" onclick={() => addChild('shape')}>
            <Icon name="shape" size={12} />{t('button.shape')}
          </Button>
        </div>
        <div class="asset-add">
          <select bind:value={chosenImage} aria-label={t('button.image')}>
            {#each imageOptions as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          <Button size="sm" variant="ghost" onclick={() => addChild('image')}>
            <Icon name="image" size={12} />{t('button.addImage')}
          </Button>
        </div>
        <div class="asset-add">
          <select bind:value={chosenDrawing} aria-label={t('button.drawing')}>
            {#each drawingOptions as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
          <Button size="sm" variant="ghost" onclick={() => addChild('drawing')}>
            <Icon name="pencil" size={12} />{t('button.addDrawing')}
          </Button>
        </div>
      </section>

      {#if selected}
        <section class="child-fields">
          <div class="section-head">
            <span class="mono-label">{t('button.selected')}</span>
            <Button size="sm" variant="ghost" onclick={removeSelected}>
              <Icon name="trash" size={12} />{t('button.remove')}
            </Button>
          </div>
          <div class="frame-grid">
            {#each ['x', 'y', 'w', 'h'] as key (key)}
              <Field
                label={key}
                type="number"
                value={selected.frame[key]}
                oninput={(event) => updateFrame(key, event.currentTarget.value)}
              />
            {/each}
          </div>
          {#if selected.type === 'text'}
            <Field
              label={t('button.text')}
              value={selected.text}
              oninput={(event) => updateSelected({ text: event.currentTarget.value })}
            />
            <div class="frame-grid">
              <Field
                label={t('button.fontSize')}
                type="number"
                value={selected.fontSize}
                min="2"
                max="30"
                oninput={(event) => updateSelected({ fontSize: Number(event.currentTarget.value) })}
              />
              <Field
                label={t('button.color')}
                type="color"
                value={selected.color}
                oninput={(event) => updateSelected({ color: event.currentTarget.value })}
              />
            </div>
          {:else if selected.type === 'shape'}
            <Select
              label={t('shape.kind')}
              value={selected.shape}
              options={[
                { value: 'circle', label: t('shape.circle') },
                { value: 'square', label: t('shape.square') },
                { value: 'triangle', label: t('shape.triangle') }
              ]}
              onchange={(value) => updateSelected({ shape: value })}
            />
            <div class="frame-grid">
              <Field
                label={t('button.fill')}
                type="color"
                value={selected.fill}
                oninput={(event) => updateSelected({ fill: event.currentTarget.value })}
              />
              <Field
                label={t('button.stroke')}
                type="color"
                value={selected.stroke}
                oninput={(event) => updateSelected({ stroke: event.currentTarget.value })}
              />
            </div>
            <div class="frame-grid">
              <Field
                label={t('button.strokeWidth')}
                type="number"
                value={selected.strokeWidth}
                min="0"
                max="20"
                oninput={(event) => updateSelected({ strokeWidth: Number(event.currentTarget.value) })}
              />
              <Field
                label={t('button.radius')}
                type="number"
                value={selected.radius}
                min="0"
                max="50"
                suffix="%"
                oninput={(event) => updateSelected({ radius: Number(event.currentTarget.value) })}
              />
            </div>
          {:else if selected.type === 'image' || selected.type === 'drawing'}
            <div class="frame-grid">
              <Button
                size="sm"
                variant={selected.fit === 'cover' ? 'accent' : 'secondary'}
                onclick={() => updateSelected({ fit: 'cover' })}
              >{t('button.cover')}</Button>
              <Button
                size="sm"
                variant={selected.fit === 'contain' ? 'accent' : 'secondary'}
                onclick={() => updateSelected({ fit: 'contain' })}
              >{t('button.contain')}</Button>
            </div>
          {/if}
        </section>
      {/if}

      <div class="state-actions">
        <Button size="sm" variant="ghost" onclick={copyState}>
          {t('button.copyState')}
        </Button>
      </div>
    </aside>
  </div>

  <div class="button-footer">
    <Button size="sm" variant="ghost" onclick={() => (open = false)} disabled={saving}>
      {t('common.cancel')}
    </Button>
    <Button size="sm" variant="accent" onclick={save} disabled={saving || children.length === 0}>
      {saving ? t('drawing.saving') : t('button.save')}
    </Button>
  </div>
</Dialog>

<style>
  .button-studio {
    display: flex;
    gap: var(--space-4);
    align-items: flex-start;
  }
  .button-main {
    flex: 1 1 560px;
    min-width: 0;
  }
  .state-tabs {
    display: flex;
    gap: 2px;
    margin-bottom: var(--space-3);
  }
  .state-tabs button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 5px 9px;
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    cursor: pointer;
  }
  .state-tabs button.active {
    border-color: var(--selection);
    background: var(--active-wash);
  }
  .state-tabs span {
    color: var(--muted);
    font-size: var(--text-3xs);
  }
  .button-stage {
    position: relative;
    display: block;
    width: 100%;
    max-width: 640px;
    min-height: 140px;
    overflow: hidden;
    border: 1px solid var(--line);
    background:
      linear-gradient(45deg, var(--panel-2) 25%, transparent 25%, transparent 75%, var(--panel-2) 75%) 0 0 / 16px 16px,
      linear-gradient(45deg, var(--panel-2) 25%, var(--panel) 25%, var(--panel) 75%, var(--panel-2) 75%) 8px 8px / 16px 16px;
  }
  .button-controls {
    flex: 0 1 300px;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-height: 62vh;
    overflow: auto;
  }
  .button-controls section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--line-soft);
  }
  .add-grid,
  .frame-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .asset-add {
    display: flex;
    gap: var(--space-1);
    align-items: center;
  }
  .asset-add select {
    flex: 1;
    min-width: 0;
    min-height: 28px;
    padding: 0 4px;
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
  }
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .state-actions {
    display: flex;
    gap: var(--space-1);
  }
  .button-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line-soft);
  }
  .hint {
    margin: var(--space-2) 0 0;
    color: var(--muted);
    font-size: var(--text-2xs);
  }
  @media (max-width: 760px) {
    .button-studio {
      flex-direction: column;
    }
    .button-controls {
      flex-basis: auto;
      width: 100%;
      max-height: none;
    }
    .button-stage {
      min-height: 100px;
    }
  }
</style>
