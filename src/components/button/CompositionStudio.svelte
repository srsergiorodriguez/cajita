<script>
  import Button from '../ui/Button.svelte';
  import { tick } from 'svelte';
  import DrawingDialog from '../drawing/DrawingDialog.svelte';
  import StudioShell from '../studio/StudioShell.svelte';
  import CompositionProperties from './CompositionProperties.svelte';
  import CompositionToolbar from './CompositionToolbar.svelte';
  import FrameTimeline from '../studio/FrameTimeline.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import ZoomableViewport from '../studio/ZoomableViewport.svelte';
  import OnionSkin from '../studio/OnionSkin.svelte';
  import SelectionFrame from '../canvas/SelectionFrame.svelte';
  import TextEditor from '../canvas/TextEditor.svelte';
  import { textEditorBackground } from '../../lib/domain/text-editor.js';
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
  let drawingOpen = $state(false);
  let drawingTargetId = $state(null);
  let loadedKey = $state('');
  let width = $state(300);
  let height = $state(100);
  let editingTextId = $state(null);
  let textDraft = $state('');
  let textarea = $state(null);
  let chosenMedia = $state('');
  let copyTargetIndex = $state(null);
  let copyConfirmOpen = $state(false);
  let zoom = $state(1);
  let fitMode = $state('page');
  let onion = $state(false);
  let onionScope = $state('all');

  const project = $derived(session.project);
  const imageAssets = $derived(Object.values(project?.assets ?? {}).filter((asset) => asset.kind === 'image'));
  const drawings = $derived(Object.values(project?.drawings ?? {}));
  const activeFrame = $derived(composition.frames.find((frame) => frame.id === activeFrameId) ?? composition.frames[0]);
  const children = $derived(activeFrame?.children ?? []);
  const frameDuration = $derived(composition.frames[0]?.duration ?? 400);
  const selected = $derived(children.find((child) => child.id === selectedId) ?? null);
  const drawingTarget = $derived(
    drawingTargetId ? children.find((child) => child.id === drawingTargetId) ?? null : null
  );
  const editingText = $derived(children.find((child) => child.id === editingTextId && child.type === 'text') ?? null);
  const orderedChildren = $derived(children.map((child, index) => ({ child, index })).reverse());
  const newFrame = $derived.by(() => {
    const stage = project?.stage ?? { width: 1200, height: 800 };
    const base = defaultFrame(stage, 'composition');
    const w = composition.preset === 'animation' ? 480 : 300;
    const h = composition.preset === 'animation' ? 480 : 100;
    return {
      ...base,
      w,
      h,
      x: (stage.width - w) / 2,
      y: (stage.height - h) / 2
    };
  });
  const frameLimit = $derived(compositionFrameLimit(composition.preset));
  const onionFrames = $derived.by(() => {
    if (!onion || previewing || composition.frames.length < 2) return [];
    const index = composition.frames.findIndex((frame) => frame.id === activeFrameId);
    if (composition.preset === 'button') {
      const reference = index === 0 ? composition.frames[1] : composition.frames[index - 1];
      return reference ? [reference] : [];
    }
    return [composition.frames[index - 1], composition.frames[index + 1]].filter(Boolean);
  });
  const isButton = $derived(composition.preset === 'button');
  const roleLabels = $derived([
    t('button.state.idle'),
    t('button.state.hover'),
    t('button.state.pressed')
  ]);
  const activeFrameIndex = $derived(
    composition.frames.findIndex((frame) => frame.id === activeFrameId)
  );
  const sizeLabel = $derived(
    t(
      composition.preset === 'animation'
        ? 'composition.sizeAnimation'
        : composition.preset === 'button'
          ? 'button.size'
          : 'composition.size'
    )
  );
  const aspect = $derived(width > 0 && height > 0 ? width / height : newFrame.w / newFrame.h);
  const fontOptions = $derived(BUILTIN_FONTS.map((font) => ({ value: font.id, label: font.label })));
  const mediaOptions = $derived([
    { value: '', label: t('button.chooseMedia') },
    ...imageAssets.map((asset) => {
      const drawing = drawings.find((item) => item.assetId === asset.id);
      return {
        value: asset.id,
        label: drawing ? `${asset.name} · ${t('button.drawing')}` : asset.name
      };
    })
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
    if (!open) {
      loadedKey = '';
      return;
    }
    const key = element?.id ?? 'new';
    if (loadedKey === key) return;
    loadedKey = key;
    const loaded = element?.composition
      ? normaliseComposition(element.composition)
      : createComposition(preset);
    const repaired = repairComposition(loaded);
    const duration = repaired.frames[0]?.duration ?? 400;
    composition = { ...repaired, frames: repaired.frames.map((frame) => ({ ...frame, duration })) };
    activeFrameId = repaired.frames[0].id;
    selectedId = null;
    drag = null;
    saving = false;
    previewing = false;
    onion = false;
    onionScope = 'all';
    zoom = 1;
    fitMode = 'page';
    drawingOpen = false;
    drawingTargetId = null;
    width = element?.frame?.w ?? newFrame.w;
    height = element?.frame?.h ?? newFrame.h;
    editingTextId = null;
    chosenMedia = '';
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

  function updateAllFrameDurations(value) {
    const duration = Math.max(50, Math.min(10000, Number(value) || frameDuration));
    composition = {
      ...composition,
      frames: composition.frames.map((frame) => ({ ...frame, duration }))
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

  function reorderFrames(fromId, toId) {
    const frames = composition.frames.slice();
    const from = frames.findIndex((frame) => frame.id === fromId);
    const to = frames.findIndex((frame) => frame.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = frames.splice(from, 1);
    frames.splice(to, 0, moved);
    applyFrameOrder(frames);
    chooseFrame(fromId);
  }

  function frameLabel(frame) {
    if (!isButton) return frame.name;
    return roleLabels[composition.frames.findIndex((item) => item.id === frame.id)] ?? frame.name;
  }

  function performCopy(targetIndex) {
    const target = composition.frames[targetIndex];
    if (!target) return;
    const nextChildren = children.map((child) =>
      createCompositionChild(child.type, { ...child, id: undefined })
    );
    const frames = composition.frames.map((frame, index) =>
      index === targetIndex ? { ...frame, children: nextChildren } : frame
    );
    composition = { ...composition, frames };
    chooseFrame(target.id);
    toast(t('composition.stateCopied', { state: roleLabels[targetIndex] }), 'success');
  }

  function copyStateTo(targetIndex) {
    if (!children.length || targetIndex === activeFrameIndex) return;
    const target = composition.frames[targetIndex];
    if (!target) return;
    if (target.children.length) {
      copyTargetIndex = targetIndex;
      copyConfirmOpen = true;
      return;
    }
    performCopy(targetIndex);
  }

  function confirmCopy() {
    if (copyTargetIndex !== null) performCopy(copyTargetIndex);
    copyConfirmOpen = false;
  }

  function addFrame() {
    if (composition.frames.length >= frameLimit) {
      return toast(t('composition.frameLimit', { count: frameLimit }), 'info');
    }
    const frame = createFrame(nextFrameName('F'));
    frame.duration = frameDuration;
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
    clone.duration = frameDuration;
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

  function addBasicChild(type) {
    const child =
      type === 'shape'
        ? createCompositionChild('shape', { frame: { x: 20, y: 20, w: 60, h: 60 }, fill: project?.palette?.[2] ?? '#a82a1e', stroke: project?.palette?.[1] ?? '#1c1917', radius: 12 })
        : createCompositionChild('text', { frame: { x: 15, y: 25, w: 70, h: 50 }, text: t('button.defaultLabel'), color: project?.palette?.[1] ?? '#1c1917' });
    updateFrame(activeFrameId, { children: [...children, child] });
    selectedId = child.id;
  }

  function addMedia() {
    const asset = project?.assets?.[chosenMedia];
    if (!asset) return toast(t('button.pickMediaFirst'), 'info');
    const drawing = drawings.find((item) => item.assetId === asset.id);
    const child = drawing
      ? createCompositionChild('drawing', {
          assetId: asset.id,
          drawingId: drawing.id,
          alt: asset.name,
          frame: assetFrame(asset)
        })
      : createCompositionChild('image', {
          assetId: asset.id,
          alt: asset.name,
          frame: assetFrame(asset)
        });
    updateFrame(activeFrameId, { children: [...children, child] });
    selectedId = child.id;
  }

  function assetFrame(asset, box = 60) {
    const assetAspect = asset?.width && asset?.height ? asset.width / asset.height : 1;
    const buttonAspect = aspect || 1;
    let w;
    let h;
    if (assetAspect >= buttonAspect) {
      w = box;
      h = box * (buttonAspect / assetAspect);
    } else {
      h = box;
      w = box * (assetAspect / buttonAspect);
    }
    return { x: (100 - w) / 2, y: (100 - h) / 2, w, h };
  }

  function openNewDrawing() {
    drawingTargetId = null;
    drawingOpen = true;
  }

  function openDrawingEditor(child) {
    drawingTargetId = child.id;
    drawingOpen = true;
  }

  function handleDrawingSaved(result) {
    const asset = result?.asset ?? project?.assets?.[result?.assetId];
    if (!asset) return;
    if (drawingTarget) {
      updateChild(drawingTarget.id, {
        assetId: asset.id,
        drawingId: result.drawingId,
        alt: drawingTarget.alt || asset.name
      });
      return;
    }
    const child = createCompositionChild('drawing', {
      assetId: asset.id,
      drawingId: result.drawingId,
      alt: asset.name,
      fit: 'contain',
      frame: assetFrame(asset)
    });
    updateFrame(activeFrameId, { children: [...children, child] });
    selectedId = child.id;
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

<StudioShell
  bind:open
  title={element ? t('composition.edit') : t(`composition.${composition.preset}`)}
>
  {#snippet toolbar()}
    <CompositionToolbar
      {composition}
      {activeFrameId}
      {isButton}
      {frameLimit}
      {frameDuration}
      {previewing}
      {onion}
      {onionScope}
      onadd={addFrame}
      onduplicate={duplicateFrame}
      onmove={moveFrame}
      onremove={removeFrame}
      ontogglepreview={() => (previewing = !previewing)}
      ontoggleonion={() => (onion = !onion)}
      onscope={(value) => (onionScope = value)}
      onduration={updateAllFrameDurations}
    />
  {/snippet}

  {#snippet canvas()}
    <ZoomableViewport
      {aspect}
      height="min(56vh, 520px)"
      bind:zoom
      bind:fitMode
    >
      <div class="composition-stage" bind:this={stageEl}>
        {#if previewing}
          <CompositionPreview {project} {composition} {aspect} play={composition.preset === 'animation'} />
        {:else}
          <CompositionView
            {project}
            {composition}
            frameId={activeFrameId}
            {aspect}
            {selectedId}
            editable
            onselect={startDrag}
            onedit={beginTextEdit}
          />
          <OnionSkin
            {project}
            {composition}
            frames={onionFrames}
            {aspect}
            opacity={0.16}
            types={onionScope === 'drawings' ? ['drawing'] : null}
          />
          {#if selected && !selected.hidden}
            <SelectionFrame
              style={`left:${selected.frame.x}%;top:${selected.frame.y}%;width:${selected.frame.w}%;height:${selected.frame.h}%;transform:rotate(${selected.frame.rotation ?? 0}deg);`}
              locked={selected.locked}
              onresize={startResize}
              onrotate={startRotate}
            />
          {/if}
          {#if editingText}
            <TextEditor
              bind:value={textDraft}
              bind:textarea
              style={`left:${editingText.frame.x}%;top:${editingText.frame.y}%;width:${editingText.frame.w}%;height:${editingText.frame.h}%;transform:rotate(${editingText.frame.rotation ?? 0}deg);font-family:${fontStack(project, editingText.font)};font-size:${editingText.fontSize}cqw;line-height:${editingText.lineHeight};letter-spacing:${editingText.letterSpacing}cqw;padding:${editingText.padding}cqw;color:${editingText.color};text-align:${editingText.align};font-weight:${editingText.heading ? 700 : 400};`}
              background={textEditorBackground(editingText.color)}
              caretColor={editingText.color}
              oncommit={commitText}
              onkeydown={handleTextKeydown}
            />
          {/if}
        {/if}
      </div>
    </ZoomableViewport>
    <p class="hint">{t('composition.hint')}</p>
  {/snippet}

  {#snippet timeline()}
    <FrameTimeline
      frames={composition.frames}
      activeFrameId={activeFrameId}
      {isButton}
      labelFor={frameLabel}
      durationLabel={(frame) => `${frame.duration}ms`}
      onselect={chooseFrame}
      onreorder={reorderFrames}
    />
  {/snippet}

  {#snippet properties()}
    <CompositionProperties
      {composition}
      {activeFrame}
      {activeFrameIndex}
      {width}
      {height}
      {sizeLabel}
      {isButton}
      {roleLabels}
      {children}
      {selected}
      {fontOptions}
      {mediaOptions}
      bind:chosenMedia
      {orderedChildren}
      {selectedId}
      onwidth={(value) => (width = value)}
      onheight={(value) => (height = value)}
      onframe={(patch) => updateFrame(activeFrame.id, patch)}
      oncomposition={(timeline) => updateComposition({ timeline })}
      oncopy={copyStateTo}
      onselect={(id) => (selectedId = id)}
      onupdate={updateSelected}
      onframeupdate={updateSelectedFrame}
      onremove={removeSelected}
      onaddbasic={addBasicChild}
      onaddmedia={addMedia}
      onnewdrawing={openNewDrawing}
      oneditdrawing={() => selected && openDrawingEditor(selected)}
      onreorder={reorderChildren}
      onupdatechild={updateChild}
      labelFor={childLabel}
    />
  {/snippet}

  {#snippet footer()}
    <Button size="sm" variant="ghost" onclick={() => (open = false)} disabled={saving}>{t('common.cancel')}</Button>
    <Button size="sm" variant="accent" onclick={save} disabled={saving}>{saving ? t('drawing.saving') : t('composition.save')}</Button>
  {/snippet}
</StudioShell>

<DrawingDialog
  bind:open={drawingOpen}
  drawingId={drawingTarget?.drawingId ?? null}
  alt={drawingTarget?.alt ?? ''}
  placement="none"
  onsaved={handleDrawingSaved}
/>

<ConfirmDialog
  bind:open={copyConfirmOpen}
  title={t('composition.copyState')}
  message={copyTargetIndex === null ? '' : t('composition.copyConfirm', { state: roleLabels[copyTargetIndex] })}
  confirmLabel={t('composition.copy')}
  danger={false}
  onconfirm={confirmCopy}
/>

<style>
  .composition-stage { position: relative; display: block; width: 100%; height: 100%; overflow: visible; border: 1px solid var(--line); background: var(--stage); container-type: size; }
  .hint { margin: var(--space-2) 0 0; max-width: 520px; color: var(--muted); font-size: var(--text-2xs); line-height: 1.4; }
</style>
