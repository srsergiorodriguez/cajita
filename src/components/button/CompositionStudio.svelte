<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Select from '../ui/Select.svelte';
  import Icon from '../ui/Icon.svelte';
  import { tick } from 'svelte';
  import LayersList from '../inspector/LayersList.svelte';
  import SelectionFrame from '../canvas/SelectionFrame.svelte';
  import CompositionView from '../canvas/CompositionView.svelte';
  import CompositionPreview from '../canvas/CompositionPreview.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import { addElement, session, updateElement } from '../../lib/state/project.svelte.js';
  import {
    createComposition,
    createCompositionChild,
    createFrame,
    compositionFrameLimit,
    normaliseComposition
  } from '../../lib/domain/composition.js';
  import { BUILTIN_FONTS, fontStack, defaultFrame } from '../../lib/domain/elements.js';
  import { rotateFrame } from '../../lib/domain/geometry.js';
  import { shapeLabel } from '../../lib/domain/shapes.js';

  let { open = $bindable(false), element = null, preset = 'button' } = $props();
  let composition = $state(createComposition('blank'));
  let activeFrameId = $state('');
  let selectedId = $state(null);
  let stageEl = $state(null);
  let drag = null;
  let saving = $state(false);
  let previewing = $state(false);
  let width = $state(300);
  let height = $state(100);
  let editingTextId = $state(null);
  let textDraft = $state('');
  let textarea = $state(null);
  let chosenImage = $state('');
  let chosenDrawing = $state('');
  let copyTarget = $state('hover');
  let draggedFrameId = $state(null);
  let frameOverId = $state(null);

  const project = $derived(session.project);
  const imageAssets = $derived(Object.values(project?.assets ?? {}).filter((asset) => asset.kind === 'image'));
  const drawings = $derived(Object.values(project?.drawings ?? {}));
  const activeFrame = $derived(composition.frames.find((frame) => frame.id === activeFrameId) ?? composition.frames[0]);
  const children = $derived(activeFrame?.children ?? []);
  const selected = $derived(children.find((child) => child.id === selectedId) ?? null);
  const editingText = $derived(children.find((child) => child.id === editingTextId && child.type === 'text') ?? null);
  const orderedChildren = $derived(children.map((child, index) => ({ child, index })).reverse());
  const newFrame = $derived(defaultFrame(project?.stage ?? { width: 1200, height: 800 }, 'composition'));
  const frameLimit = $derived(compositionFrameLimit(composition.preset));
  const isButton = $derived(composition.preset === 'button');
  const roleLabels = $derived([
    t('button.state.idle'),
    t('button.state.hover'),
    t('button.state.pressed')
  ]);
  const copyTargets = $derived(
    roleLabels
      .map((label, index) => ({ value: roleLabels[index], index }))
      .filter((item) => item.index !== composition.frames.findIndex((frame) => frame.id === activeFrameId))
      .map((item) => ({ value: item.value, label: roleLabels[item.index] }))
  );
  const aspect = $derived(width > 0 && height > 0 ? width / height : newFrame.w / newFrame.h);
  const fontOptions = $derived(BUILTIN_FONTS.map((font) => ({ value: font.id, label: font.label })));
  const imageOptions = $derived([
    { value: '', label: t('button.chooseImage') },
    ...imageAssets.map((asset) => ({ value: asset.id, label: asset.name }))
  ]);
  const drawingOptions = $derived([
    { value: '', label: t('button.chooseDrawing') },
    ...drawings.map((drawing) => ({ value: drawing.id, label: drawing.id.slice(0, 12) }))
  ]);

  function drawingAssetId(drawingId) {
    const drawing = project?.drawings?.[drawingId];
    if (drawing?.assetId && project?.assets?.[drawing.assetId]) return drawing.assetId;
    for (const page of project?.pages ?? []) {
      const found = (page.elements ?? []).find((item) => item.type === 'drawing' && item.drawingId === drawingId);
      if (found?.assetId && project?.assets?.[found.assetId]) return found.assetId;
    }
    return '';
  }

  function repairComposition(source) {
    let removed = 0;
    const frames = source.frames.map((frame) => ({
      ...frame,
      children: frame.children.flatMap((child) => {
        if (child.type !== 'image' && child.type !== 'drawing') return [child];
        let assetId = child.assetId;
        if (!project?.assets?.[assetId] && child.drawingId) assetId = drawingAssetId(child.drawingId);
        if (!project?.assets?.[assetId]) {
          removed += 1;
          return [];
        }
        return [{ ...child, assetId }];
      })
    }));
    if (removed) toast(t('button.repaired'), 'info');
    return { ...source, frames };
  }

  $effect(() => {
    if (!open) return;
    const loaded = element?.composition
      ? normaliseComposition(element.composition)
      : createComposition(preset);
    const repaired = repairComposition(loaded);
    composition = repaired;
    activeFrameId = repaired.frames[0].id;
    selectedId = null;
    drag = null;
    saving = false;
    previewing = false;
    width = element?.frame?.w ?? newFrame.w;
    height = element?.frame?.h ?? newFrame.h;
    editingTextId = null;
    copyTarget = t('button.state.hover');
    chosenImage = '';
    chosenDrawing = '';
  });

  function updateComposition(patch) {
    composition = { ...composition, ...patch };
  }

  function updateFrame(frameId, patch) {
    composition = {
      ...composition,
      frames: composition.frames.map((frame) => (frame.id === frameId ? { ...frame, ...patch } : frame))
    };
  }

  function updateChild(id, patch) {
    updateFrame(activeFrameId, {
      children: children.map((child) => (child.id === id ? { ...child, ...patch } : child))
    });
  }

  function updateSelected(patch) {
    if (selected) updateChild(selected.id, patch);
  }

  function updateSelectedFrame(key, value) {
    updateSelected({ frame: { ...selected.frame, [key]: Number(value) } });
  }

  function chooseFrame(frameId) {
    activeFrameId = frameId;
    selectedId = null;
    previewing = false;
    editingTextId = null;
    const nextIndex = composition.frames.findIndex((frame) => frame.id === frameId);
    if (composition.preset === 'button' && nextIndex >= 0) {
      copyTarget = roleLabels[(nextIndex + 1) % 3];
    }
  }

  function cleanFrameBase(name) {
    return String(name ?? '')
      .replace(/\s+copia(?:\s+\d+)?$/i, '')
      .replace(/\s+\d+$/, '')
      .trim();
  }

  function nextFrameName(base = 'Fotograma') {
    const clean = base || 'Fotograma';
    const used = composition.frames.map((frame) => frame.name.trim().toLowerCase());
    if (clean.toUpperCase() === 'F' || /^f(\d+)$/i.test(clean)) {
      let number = composition.frames.length + 1;
      const numbers = composition.frames
        .map((frame) => /^f(\d+)$/i.exec(frame.name.trim()))
        .filter(Boolean)
        .map((match) => Number(match[1]));
      if (numbers.length) number = Math.max(...numbers) + 1;
      while (used.includes(`f${number}`.toLowerCase())) number += 1;
      return `F${number}`;
    }
    let number = 2;
    while (used.includes(`${clean} ${number}`.toLowerCase())) number += 1;
    return `${clean} ${number}`;
  }

  function applyFrameOrder(frames) {
    const next =
      composition.preset === 'animation'
        ? frames.map((frame, index) => ({ ...frame, name: `F${index + 1}` }))
        : frames;
    const interactions =
      composition.preset === 'button'
        ? {
            hover: next[1]?.id ?? next[0].id,
            pressed: next[2]?.id ?? next[1]?.id ?? next[0].id
          }
        : composition.interactions;
    composition = { ...composition, frames: next, interactions };
  }

  function moveFrame(direction) {
    const index = composition.frames.findIndex((frame) => frame.id === activeFrameId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= composition.frames.length) return;
    const frames = composition.frames.slice();
    [frames[index], frames[target]] = [frames[target], frames[index]];
    applyFrameOrder(frames);
  }

  function dropFrame(targetId) {
    if (!draggedFrameId || draggedFrameId === targetId) {
      draggedFrameId = null;
      frameOverId = null;
      return;
    }
    const frames = composition.frames.slice();
    const from = frames.findIndex((frame) => frame.id === draggedFrameId);
    const to = frames.findIndex((frame) => frame.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = frames.splice(from, 1);
    frames.splice(to, 0, moved);
    applyFrameOrder(frames);
    draggedFrameId = null;
    frameOverId = null;
  }

  function frameLabel(frame) {
    if (!isButton) return frame.name;
    return roleLabels[composition.frames.findIndex((item) => item.id === frame.id)] ?? frame.name;
  }

  function copyState() {
    const sourceIndex = composition.frames.findIndex((frame) => frame.id === activeFrameId);
    const targetIndex = roleLabels.indexOf(copyTarget);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const target = composition.frames[targetIndex];
    if (target.children.length && !window.confirm(t('composition.copyConfirm', { state: copyTarget }))) {
      return;
    }
    const nextChildren = children.map((child) =>
      createCompositionChild(child.type, { ...child, id: undefined })
    );
    const frames = composition.frames.map((frame, index) =>
      index === targetIndex ? { ...frame, children: nextChildren } : frame
    );
    composition = { ...composition, frames };
    toast(t('composition.stateCopied', { state: copyTarget }), 'success');
  }

  function addFrame() {
    if (composition.frames.length >= frameLimit) {
      return toast(t('composition.frameLimit', { count: frameLimit }), 'info');
    }
    const frame = createFrame(nextFrameName('F'));
    applyFrameOrder([...composition.frames, frame]);
    chooseFrame(frame.id);
  }

  function duplicateFrame() {
    if (composition.frames.length >= frameLimit) {
      return toast(t('composition.frameLimit', { count: frameLimit }), 'info');
    }
    const clone = structuredClone($state.snapshot(activeFrame));
    clone.id = createFrame().id;
    clone.name = nextFrameName(
      composition.preset === 'animation' ? 'F' : cleanFrameBase(activeFrame.name)
    );
    applyFrameOrder([...composition.frames, clone]);
    chooseFrame(clone.id);
  }

  function removeFrame() {
    if (composition.frames.length < 2) return;
    const frames = composition.frames.filter((frame) => frame.id !== activeFrameId);
    const nextId = frames[0].id;
    applyFrameOrder(frames);
    chooseFrame(nextId);
  }

  function addChild(type) {
    if (type === 'image' && !chosenImage) return toast(t('button.pickImageFirst'), 'info');
    if (type === 'drawing' && !chosenDrawing) return toast(t('button.pickDrawingFirst'), 'info');
    const asset = type === 'image' ? project?.assets?.[chosenImage] : project?.assets?.[drawingAssetId(chosenDrawing)];
    const child =
      type === 'image'
        ? createCompositionChild('image', { assetId: chosenImage, alt: imageAssets.find((item) => item.id === chosenImage)?.name ?? '', frame: assetFrame(asset) })
        : type === 'drawing'
          ? createCompositionChild('drawing', { assetId: asset?.id ?? '', drawingId: chosenDrawing, frame: assetFrame(asset) })
          : type === 'shape'
            ? createCompositionChild('shape', { frame: { x: 20, y: 20, w: 60, h: 60 }, fill: project?.palette?.[2] ?? '#a82a1e', stroke: project?.palette?.[1] ?? '#1c1917', radius: 12 })
            : createCompositionChild('text', { frame: { x: 15, y: 25, w: 70, h: 50 }, text: t('button.defaultLabel'), color: project?.palette?.[1] ?? '#1c1917' });
    if ((type === 'image' || type === 'drawing') && !project?.assets?.[child.assetId]) {
      return toast(t('button.missingAsset'), 'error');
    }
    updateFrame(activeFrameId, { children: [...children, child] });
    selectedId = child.id;
  }

  function assetFrame(asset, box = 60) {
    const ratio = asset?.width && asset?.height ? asset.width / asset.height : 1;
    const w = ratio >= 1 ? box : box * ratio;
    const h = ratio >= 1 ? box / ratio : box;
    return { x: (100 - w) / 2, y: (100 - h) / 2, w, h };
  }

  function removeSelected() {
    if (!selected) return;
    updateFrame(activeFrameId, { children: children.filter((child) => child.id !== selected.id) });
    selectedId = null;
  }

  function reorderChildren(ids) {
    const byId = new Map(children.map((child) => [child.id, child]));
    updateFrame(activeFrameId, { children: ids.map((id) => byId.get(id)).filter(Boolean).reverse() });
  }

  function childLabel(child) {
    if (child.name) return child.name;
    if (child.type === 'text') return child.text || t('button.text');
    if (child.type === 'shape') return shapeLabel(child.shape, project?.locale);
    if (child.type === 'drawing') return t('button.drawing');
    return project?.assets?.[child.assetId]?.name || t('button.image');
  }

  function childIcon(child) {
    if (child.type === 'text') return 'text';
    if (child.type === 'shape') return 'shape';
    if (child.type === 'drawing') return 'pencil';
    return 'image';
  }

  function beginTextEdit(childId) {
    const child = children.find((item) => item.id === childId && item.type === 'text');
    if (!child || child.locked) return;
    selectedId = childId;
    editingTextId = childId;
    textDraft = child.text;
    tick().then(() => {
      textarea?.focus();
      textarea?.select();
    });
  }

  function commitText() {
    if (!editingTextId) return;
    if (textDraft !== editingText?.text) updateSelected({ text: textDraft });
    editingTextId = null;
  }

  function handleTextKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      commitText();
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      commitText();
    }
  }

  function startDrag(childId, event) {
    selectedId = childId;
    const child = children.find((item) => item.id === childId);
    if (!child || child.locked || !stageEl) return;
    drag = { mode: 'move', id: childId, startX: event.clientX, startY: event.clientY, x: child.frame.x, y: child.frame.y, w: child.frame.w, h: child.frame.h };
  }

  function startResize(event, handle) {
    if (!selected || selected.locked || selected.hidden || !stageEl) return;
    event.preventDefault();
    event.stopPropagation();
    drag = { mode: 'resize', handle, id: selected.id, startX: event.clientX, startY: event.clientY, x: selected.frame.x, y: selected.frame.y, w: selected.frame.w, h: selected.frame.h };
  }

  function startRotate(event) {
    if (!selected || selected.locked || !stageEl) return;
    event.preventDefault();
    event.stopPropagation();
    drag = { mode: 'rotate', id: selected.id };
  }

  function moveDrag(event) {
    if (!drag || !stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const child = children.find((item) => item.id === drag.id);
    if (!child) return;
    if (drag.mode === 'rotate') {
      const frame = rotateFrame(child.frame, { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 }, event.shiftKey ? 0 : 15);
      updateSelected({ frame: { ...child.frame, rotation: frame.rotation } });
      return;
    }
    const dx = ((event.clientX - drag.startX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startY) / rect.height) * 100;
    if (drag.mode === 'move') {
      updateSelected({ frame: { ...child.frame, x: Math.max(0, Math.min(100 - child.frame.w, drag.x + dx)), y: Math.max(0, Math.min(100 - child.frame.h, drag.y + dy)) } });
      return;
    }
    let { x, y, w, h } = drag;
    if (drag.handle.includes('w')) { x = Math.max(0, Math.min(drag.x + drag.w - 5, drag.x + dx)); w = drag.x + drag.w - x; }
    if (drag.handle.includes('e')) w = Math.max(5, Math.min(100 - drag.x, drag.w + dx));
    if (drag.handle.includes('n')) { y = Math.max(0, Math.min(drag.y + drag.h - 5, drag.y + dy)); h = drag.y + drag.h - y; }
    if (drag.handle.includes('s')) h = Math.max(5, Math.min(100 - drag.y, drag.h + dy));
    updateSelected({ frame: { ...child.frame, x, y, w, h } });
  }

  function endDrag() {
    drag = null;
  }

  function save() {
    if (saving) return;
    saving = true;
    try {
      const data = repairComposition(normaliseComposition($state.snapshot(composition)));
      const label = element?.label || (data.preset === 'animation' ? t('composition.animation') : t('composition.button'));
      if (element) {
        updateElement(element.id, { composition: data, preset: data.preset, label, frame: { ...element.frame, w: Math.max(20, Number(width) || element.frame.w), h: Math.max(20, Number(height) || element.frame.h) } });
      } else {
        addElement('composition', { composition: data, compositionPreset: data.preset, compositionLabel: label, frame: { ...newFrame, w: Math.max(20, Number(width) || newFrame.w), h: Math.max(20, Number(height) || newFrame.h) } });
      }
      open = false;
      saving = false;
      toast(t('composition.saved'), 'success');
    } catch (error) {
      saving = false;
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }
</script>

<svelte:window onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag} />

<Dialog bind:open title={element ? t('composition.edit') : t(`composition.${composition.preset}`)} wide>
  <div class="composition-studio">
    <div class="composition-main">
      <div class="frame-row">
        <div class="frame-tabs">
          {#each composition.frames as frame (frame.id)}
            <button
              type="button"
              class:active={frame.id === activeFrameId}
              class:dragging={draggedFrameId === frame.id}
              class:drag-over={frameOverId === frame.id}
              title={frameLabel(frame)}
              draggable={!isButton}
              ondragstart={(event) => {
                if (isButton) return;
                draggedFrameId = frame.id;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', frame.id);
              }}
              ondragover={(event) => {
                if (isButton) return;
                event.preventDefault();
                frameOverId = frame.id;
              }}
              ondragleave={() => {
                if (frameOverId === frame.id) frameOverId = null;
              }}
              ondrop={(event) => {
                if (isButton) return;
                event.preventDefault();
                dropFrame(frame.id);
              }}
              ondragend={() => {
                draggedFrameId = null;
                frameOverId = null;
              }}
              onclick={() => chooseFrame(frame.id)}
            >
              <b>{frameLabel(frame)}</b><span>{frame.children.length}</span>
            </button>
          {/each}
        </div>
        <div class="frame-actions">
          {#if !isButton}
            <span class="frame-count">{composition.frames.length}/{frameLimit}</span>
            <Button size="sm" variant="ghost" onclick={addFrame} disabled={composition.frames.length >= frameLimit}><Icon name="plus" size={12} />{t('composition.addFrame')}</Button>
            <Button size="sm" variant="ghost" onclick={duplicateFrame} disabled={composition.frames.length >= frameLimit}>{t('composition.duplicateFrame')}</Button>
            <Button size="sm" variant="ghost" onclick={() => moveFrame(-1)} disabled={composition.frames.findIndex((frame) => frame.id === activeFrameId) <= 0} aria-label={t('composition.moveFrameLeft')} title={t('composition.moveFrameLeft')}>←</Button>
            <Button size="sm" variant="ghost" onclick={() => moveFrame(1)} disabled={composition.frames.findIndex((frame) => frame.id === activeFrameId) >= composition.frames.length - 1} aria-label={t('composition.moveFrameRight')} title={t('composition.moveFrameRight')}>→</Button>
            <Button size="sm" variant="ghost" onclick={removeFrame} disabled={composition.frames.length < 2}><Icon name="trash" size={12} /></Button>
          {/if}
          <button type="button" class="preview-toggle" class:active={previewing} onclick={() => (previewing = !previewing)}>
            {previewing ? t('composition.backToEdit') : t('composition.preview')}
          </button>
        </div>
      </div>
      <div
        class="composition-stage"
        style:aspect-ratio={aspect}
        style:width={`${Math.round(width)}px`}
        bind:this={stageEl}
      >
        {#if previewing}
          <CompositionPreview {project} {composition} {aspect} />
        {:else}
          <CompositionView {project} {composition} frameId={activeFrameId} {aspect} {selectedId} editable onselect={startDrag} onedit={beginTextEdit} />
          {#if selected && !selected.hidden}
            <SelectionFrame
              style={`left:${selected.frame.x}%;top:${selected.frame.y}%;width:${selected.frame.w}%;height:${selected.frame.h}%;transform:rotate(${selected.frame.rotation ?? 0}deg);`}
              locked={selected.locked}
              onresize={startResize}
              onrotate={startRotate}
            />
          {/if}
          {#if editingText}
            <textarea
              bind:this={textarea}
              bind:value={textDraft}
              class="composition-text-edit"
              style={`left:${editingText.frame.x}%;top:${editingText.frame.y}%;width:${editingText.frame.w}%;height:${editingText.frame.h}%;transform:rotate(${editingText.frame.rotation ?? 0}deg);font-family:${fontStack(project, editingText.font)};font-size:${editingText.fontSize}cqw;line-height:${editingText.lineHeight};letter-spacing:${editingText.letterSpacing}cqw;padding:${editingText.padding}cqw;color:${editingText.color};text-align:${editingText.align};font-weight:${editingText.heading ? 700 : 400};`}
              onpointerdown={(event) => event.stopPropagation()}
              onkeydown={handleTextKeydown}
              onblur={commitText}
              aria-label={t('canvas.editText')}
            ></textarea>
          {/if}
        {/if}
      </div>
      <p class="hint">{t('composition.hint')}</p>
    </div>

    <aside class="composition-controls">
      <section>
        <span class="mono-label">{t('button.size')}</span>
        <div class="grid-2">
          <Field label={t('button.width')} type="number" min="20" value={Math.round(width)} oninput={(event) => (width = Number(event.currentTarget.value))} />
          <Field label={t('button.height')} type="number" min="20" value={Math.round(height)} oninput={(event) => (height = Number(event.currentTarget.value))} />
        </div>
      </section>

      <section>
        <span class="mono-label">{t('composition.currentFrame')}</span>
        {#if !isButton}
          <Field label={t('composition.frameName')} value={activeFrame.name} oninput={(event) => updateFrame(activeFrame.id, { name: event.currentTarget.value })} />
        {/if}
        {#if composition.preset === 'animation'}
          <Field label={t('composition.duration')} type="number" min="50" max="10000" value={activeFrame.duration} oninput={(event) => updateFrame(activeFrame.id, { duration: Number(event.currentTarget.value) })} />
        {/if}
      </section>

      {#if composition.preset === 'button'}
        <p class="hint">{t('composition.buttonRolesHint')}</p>
        <section>
          <span class="mono-label">{t('composition.copyState')}</span>
          <Select label={t('composition.copyTo')} value={copyTarget} options={copyTargets} onchange={(value) => (copyTarget = value)} />
          <Button size="sm" variant="secondary" onclick={copyState} disabled={!children.length}>{t('composition.copy')}</Button>
        </section>
      {/if}

      {#if composition.preset === 'animation'}
        <section>
          <span class="mono-label">{t('composition.timeline')}</span>
          <label class="check"><input type="checkbox" checked={composition.timeline.autoplay} onchange={(event) => updateComposition({ timeline: { ...composition.timeline, autoplay: event.currentTarget.checked } })} /><span>{t('composition.autoplay')}</span></label>
          <label class="check"><input type="checkbox" checked={composition.timeline.loop} onchange={(event) => updateComposition({ timeline: { ...composition.timeline, loop: event.currentTarget.checked } })} /><span>{t('composition.loop')}</span></label>
          <div class="sequence">
            <div class="sequence-head">
              <span>{t('composition.frame')}</span>
              <span>{t('composition.duration')}</span>
            </div>
            {#each composition.frames as frame (frame.id)}
              <div class="sequence-row">
                <span class="sequence-name" title={frame.name}>{frame.name}</span>
                <label class="duration-box">
                  <input
                    type="number"
                    min="50"
                    max="10000"
                    step="50"
                    value={frame.duration}
                    aria-label={t('composition.duration')}
                    oninput={(event) => updateFrame(frame.id, { duration: Number(event.currentTarget.value) })}
                  />
                  <span>ms</span>
                </label>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <section>
        <span class="mono-label">{t('button.add')}</span>
        <div class="grid-2">
          <Button size="sm" variant="secondary" onclick={() => addChild('text')}><Icon name="text" size={12} />{t('button.text')}</Button>
          <Button size="sm" variant="secondary" onclick={() => addChild('shape')}><Icon name="shape" size={12} />{t('button.shape')}</Button>
        </div>
        <div class="asset-add">
          <Select label={t('button.image')} value={chosenImage} options={imageOptions} onchange={(value) => (chosenImage = value)} />
          <Button size="sm" variant="ghost" onclick={() => addChild('image')}><Icon name="image" size={12} />{t('button.addImage')}</Button>
        </div>
        <div class="asset-add">
          <Select label={t('button.drawing')} value={chosenDrawing} options={drawingOptions} onchange={(value) => (chosenDrawing = value)} />
          <Button size="sm" variant="ghost" onclick={() => addChild('drawing')}><Icon name="pencil" size={12} />{t('button.addDrawing')}</Button>
        </div>
      </section>

      <section class="layers-section">
        <span class="mono-label">{t('composition.layers')}</span>
        <LayersList elements={orderedChildren.map((item) => item.child)} presorted selectedIds={selectedId ? [selectedId] : []} onselect={(id) => (selectedId = id)} onreorder={reorderChildren} onupdate={updateChild} labelFor={childLabel} canRename={false} emptyText={t('composition.noLayers')} />
      </section>

      {#if selected}
        <section class="child-fields">
          <div class="section-head"><span class="mono-label">{t('button.selected')}</span><Button size="sm" variant="ghost" onclick={removeSelected}><Icon name="trash" size={12} />{t('button.remove')}</Button></div>
          <div class="grid-2">
            {#each [['x', 'button.x'], ['y', 'button.y'], ['w', 'button.w'], ['h', 'button.h']] as [key, label] (key)}
              <Field label={t(label)} type="number" value={selected.frame[key]} oninput={(event) => updateSelectedFrame(key, event.currentTarget.value)} />
            {/each}
          </div>
          {#if selected.type === 'text'}
            <Field label={t('button.text')} value={selected.text} oninput={(event) => updateSelected({ text: event.currentTarget.value })} />
            <Select label={t('button.font')} value={selected.font} options={fontOptions} onchange={(value) => updateSelected({ font: value })} />
            <div class="grid-2">
              <Field label={t('button.fontSize')} type="number" value={selected.fontSize} min="2" max="30" oninput={(event) => updateSelected({ fontSize: Number(event.currentTarget.value) })} />
              <Field label={t('button.color')} type="color" value={selected.color} oninput={(event) => updateSelected({ color: event.currentTarget.value })} />
            </div>
          {:else if selected.type === 'shape'}
            <Select label={t('shape.kind')} value={selected.shape} options={[{ value: 'circle', label: t('shape.circle') }, { value: 'square', label: t('shape.square') }, { value: 'triangle', label: t('shape.triangle') }]} onchange={(value) => updateSelected({ shape: value })} />
            <div class="grid-2">
              <Field label={t('button.fill')} type="color" value={selected.fill} oninput={(event) => updateSelected({ fill: event.currentTarget.value })} />
              <Field label={t('button.stroke')} type="color" value={selected.stroke} oninput={(event) => updateSelected({ stroke: event.currentTarget.value })} />
              <Field label={t('button.strokeWidth')} type="number" min="0" max="20" value={selected.strokeWidth} oninput={(event) => updateSelected({ strokeWidth: Number(event.currentTarget.value) })} />
              <Field label={t('button.radius')} type="number" min="0" max="50" suffix="%" value={selected.radius} oninput={(event) => updateSelected({ radius: Number(event.currentTarget.value) })} />
            </div>
          {:else if selected.type === 'image' || selected.type === 'drawing'}
            <div class="grid-2">
              <Button size="sm" variant={selected.fit === 'cover' ? 'accent' : 'secondary'} onclick={() => updateSelected({ fit: 'cover' })}>{t('button.cover')}</Button>
              <Button size="sm" variant={selected.fit === 'contain' ? 'accent' : 'secondary'} onclick={() => updateSelected({ fit: 'contain' })}>{t('button.contain')}</Button>
            </div>
          {/if}
        </section>
      {/if}
    </aside>
  </div>

  <div class="composition-footer">
    <Button size="sm" variant="ghost" onclick={() => (open = false)} disabled={saving}>{t('common.cancel')}</Button>
    <Button size="sm" variant="accent" onclick={save} disabled={saving}>{saving ? t('drawing.saving') : t('composition.save')}</Button>
  </div>
</Dialog>

<style>
  .composition-studio { display: flex; justify-content: center; gap: var(--space-4); align-items: flex-start; max-width: 820px; margin: 0 auto; }
  .composition-main { flex: 0 1 520px; width: 100%; max-width: 520px; min-width: 0; }
  .frame-row { display: flex; flex-direction: column; align-items: stretch; gap: var(--space-2); margin-bottom: var(--space-3); }
  .frame-actions { justify-content: flex-start; }
  .frame-tabs { display: flex; gap: 2px; flex-wrap: wrap; min-width: 0; }
  .frame-tabs button { display: flex; align-items: center; gap: var(--space-2); max-width: 180px; min-width: 0; padding: 5px 9px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-family: var(--font-ui); font-size: var(--text-xs); cursor: grab; }
  .frame-tabs button:active { cursor: grabbing; }
  .frame-tabs button.active { border-color: var(--selection); background: var(--active-wash); }
  .frame-tabs button.dragging { opacity: 0.45; }
  .frame-tabs button.drag-over { border-color: var(--selection); box-shadow: inset 0 0 0 1px var(--selection); }
  .frame-tabs b { overflow: hidden; font-weight: inherit; text-overflow: ellipsis; white-space: nowrap; }
  .frame-tabs span { flex: 0 0 auto; color: var(--muted); font-size: var(--text-3xs); }
  .frame-actions { display: flex; align-items: center; gap: var(--space-1); flex-wrap: wrap; min-height: 28px; }
  .frame-count { color: var(--muted); font-family: var(--font-ui); font-size: var(--text-2xs); font-variant-numeric: tabular-nums; }
  .preview-toggle { padding: 5px 8px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-family: var(--font-ui); font-size: var(--text-xs); cursor: pointer; }
  .preview-toggle.active { border-color: var(--selection); background: var(--active-wash); }
  .composition-stage { position: relative; display: block; width: 100%; max-width: 100%; margin: 0 auto; overflow: hidden; border: 1px solid var(--line); background: var(--stage); container-type: size; }
  .composition-controls { flex: 0 1 270px; display: flex; flex-direction: column; gap: var(--space-3); }
  .composition-controls section { display: flex; flex-direction: column; gap: var(--space-2); }
  .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-1); }
  .asset-add { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: var(--space-1); }
  .section-head { display: flex; justify-content: space-between; align-items: center; }
  .sequence { display: flex; flex-direction: column; gap: 2px; }
  .sequence-head,
  .sequence-row { display: grid; grid-template-columns: minmax(0, 1fr) 76px; align-items: center; gap: var(--space-2); }
  .sequence-head { color: var(--muted); font-size: var(--text-3xs); letter-spacing: 0.08em; text-transform: uppercase; }
  .sequence-head span:last-child { text-align: right; }
  .sequence-row { min-height: 26px; }
  .sequence-name { overflow: hidden; font-size: var(--text-2xs); text-overflow: ellipsis; white-space: nowrap; }
  .duration-box { display: flex; align-items: center; min-height: 24px; border: 1px solid var(--line); background: var(--panel-2); }
  .duration-box input { width: 100%; min-width: 0; padding: 0 2px 0 5px; border: 0; background: transparent; color: var(--ink); font-family: var(--font-ui); font-size: var(--text-2xs); text-align: right; }
  .duration-box span { padding-right: 5px; color: var(--muted); font-size: var(--text-3xs); }
  .composition-footer { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--line-soft); }
  .hint { margin: var(--space-2) 0 0; max-width: 520px; color: var(--muted); font-size: var(--text-2xs); line-height: 1.4; }
  .composition-text-edit { position: absolute; z-index: 3; margin: 0; border: 1px dashed var(--selection); outline: none; background: var(--stage); resize: none; overflow: hidden; white-space: pre-wrap; }
  @media (max-width: 760px) {
    .composition-studio { flex-direction: column; max-width: 520px; }
    .composition-main { flex-basis: auto; max-width: 100%; }
    .composition-controls { flex-basis: auto; width: 100%; }
  }
</style>
