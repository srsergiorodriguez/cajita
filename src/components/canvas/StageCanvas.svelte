<script>
  import CanvasAsset from './CanvasAsset.svelte';
  import LiveDrawing from './LiveDrawing.svelte';
  import CanvasVideo from './CanvasVideo.svelte';
  import CanvasAudio from './CanvasAudio.svelte';
  import CanvasEmbed from './CanvasEmbed.svelte';
  import CanvasHtml from './CanvasHtml.svelte';
  import CanvasFichaCollection from './CanvasFichaCollection.svelte';
  import CompositionPreview from './CompositionPreview.svelte';
  import ShapeArt from './ShapeArt.svelte';
  import CanvasFicha from './CanvasFicha.svelte';
  import Icon from '../ui/Icon.svelte';
  import IconButton from '../ui/IconButton.svelte';
  import { t, plural } from '../../lib/i18n/index.svelte.js';
  import {
    activePage,
    addElement,
    fitTextHeight,
    selectedElements,
    session,
    selectElement,
    updateElement,
    moveElements
  } from '../../lib/state/project.svelte.js';
  import {
    editor,
    setGuides,
    clearGuides,
    beginTextEdit,
    endTextEdit,
    setViewportWidth
  } from '../../lib/state/editor.svelte.js';
  import { ensureProjectFonts, fontState } from '../../lib/state/fonts.svelte.js';
  import {
    elementToCss,
    pxToCqw,
    pointToLocal,
    rotateFrame,
    resizeRotatedFrame,
    snapMove
  } from '../../lib/domain/geometry.js';
  import { elementName, fontStack, mediaFrame } from '../../lib/domain/elements.js';
  import { snapFrameMove, snapFrameResize } from '../../lib/domain/grid.js';
  import { buildPrintPages, formatPageNumber, printContentSize, PRINT_MARGIN_SIDE_INSET_MM, PRINT_MARGIN_VERTICAL_INSET_MM } from '../../lib/domain/print.js';
  import GridOverlay from './GridOverlay.svelte';
  import SelectionFrame from './SelectionFrame.svelte';
  import TextEditor from './TextEditor.svelte';
  import { textEditorBackground } from '../../lib/domain/text-editor.js';
  import ZoomControls from './ZoomControls.svelte';
  import { toast } from '../../lib/state/ui.svelte.js';

  let stageEl = $state(null);
  let wrapEl = $state(null);
  let wrapW = $state(0);
  let wrapH = $state(0);
  let zoom = $state(1);
  let fitMode = $state('width');
  let textarea = $state(null);
  let pointerState = null;

  const page = $derived(activePage());
  const stage = $derived(session.project?.stage ?? { width: 1200, height: 800 });
  const pageBackground = $derived(
    page?.background?.color ?? stage.background?.color ?? '#ffffff'
  );
  const elements = $derived(
    [...(page?.elements ?? [])].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
  );
  const selected = $derived(selectedElements());
  const primary = $derived(selected[0] ?? null);
  const editing = $derived(
    page?.elements.find((element) => element.id === editor.editingElementId) ?? null
  );
  const placementAsset = $derived(
    session.selectedAssetId ? session.project?.assets?.[session.selectedAssetId] : null
  );
  const placing = $derived(['image', 'video', 'audio'].includes(placementAsset?.kind));
  const aspect = $derived(stage.width / stage.height);
  const activeGrid = $derived(
    page?.gridId ? session.project?.grids?.[page.gridId] ?? null : null
  );
  const gridSnapping = $derived(
    Boolean(activeGrid && session.project?.gridSettings?.snap)
  );
  const textMeasureKey = $derived(
    elements
      .filter((element) => element.type === 'text' && !element.hidden)
      .map(
        (element) =>
          `${element.id}:${element.text}:${element.font}:${element.fontSize}:${element.lineHeight}:${element.letterSpacing}:${element.frame.w}:${element.padding}:${element.hidden}:${editor.viewportWidth || stage.width}`
      )
      .join('|')
  );
  const viewportWidth = $derived(editor.viewportWidth || stage.width);
  const stageHeight = $derived(viewportWidth / aspect);
  const displayWidth = $derived(viewportWidth * zoom);
  const displayHeight = $derived(stageHeight * zoom);
  const padWidth = $derived(Math.max(wrapW, (printGuide?.width ?? displayWidth) + 48));
  const padHeight = $derived(Math.max(wrapH, (printGuide?.height ?? displayHeight) + 48));
  const viewportOptions = $derived(
    [...new Set([390, 768, 1024, stage.width, stage.maxWidth].filter((width) => Number.isFinite(width) && width > 0))]
      .sort((a, b) => a - b)
  );
  const pageIndex = $derived(
    Math.max(0, session.project?.pages.findIndex((item) => item.id === page?.id) ?? 0)
  );
  const printPages = $derived(
    session.project?.print ? buildPrintPages(session.project) : []
  );
  const printEntry = $derived(
    printPages.find((entry) => entry.kind === 'page' && entry.page?.id === page?.id) ?? null
  );
  const printEntryIndex = $derived(
    printEntry ? printPages.indexOf(printEntry) : pageIndex
  );
  const printFrame = $derived.by(() => {
    if (!editor.showPrintMargins || !session.project?.print) return null;
    try {
      const print = session.project.print;
      const content = printContentSize(print);
      const scale = viewportWidth / content.width;
      const inner = print.margins.inner * scale;
      const outer = print.margins.outer * scale;
      const leftBase = printEntryIndex % 2 === 0 ? inner : outer;
      const rightBase = printEntryIndex % 2 === 0 ? outer : inner;
      return {
        leftBase,
        rightBase,
        topBase: print.margins.top * scale,
        bottomBase: print.margins.bottom * scale,
        baseWidth: viewportWidth + leftBase + rightBase,
        baseHeight: stageHeight + print.margins.top * scale + print.margins.bottom * scale
      };
    } catch {
      return null;
    }
  });
  const printGuide = $derived(
    printFrame
      ? {
          left: printFrame.leftBase * zoom,
          right: printFrame.rightBase * zoom,
          top: printFrame.topBase * zoom,
          bottom: printFrame.bottomBase * zoom,
          width: displayWidth + (printFrame.leftBase + printFrame.rightBase) * zoom,
          height: displayHeight + (printFrame.topBase + printFrame.bottomBase) * zoom
        }
      : null
  );
  const printParatext = $derived.by(() => {
    if (!printGuide || !printEntry || !session.project?.print) return [];
    const print = session.project.print;
    const side = printEntryIndex % 2 === 0 ? 'right' : 'left';
    const content = printContentSize(print);
    const pxPerMm = displayWidth / content.width;
    const insetX = PRINT_MARGIN_SIDE_INSET_MM * pxPerMm;
    const insetY = PRINT_MARGIN_VERTICAL_INSET_MM * pxPerMm;
    const paperLeft = -printGuide.left;
    const paperRight = displayWidth + printGuide.right;
    const paperTop = -printGuide.top;
    const positionStyle = (position) => {
      const [vertical, horizontal] = position.split('-');
      const styles = [];
      if (horizontal === 'center') {
        styles.push(`left:${(paperLeft + paperRight) / 2}px`, 'transform:translateX(-50%)');
      } else {
        const onLeft =
          horizontal === 'inner'
            ? side === 'right'
            : horizontal === 'outer'
              ? side === 'left'
              : false;
        if (onLeft) styles.push(`left:${paperLeft + insetX}px`);
        else styles.push(`right:${-(printGuide.right - insetX)}px`);
      }
      if (vertical === 'top') styles.push(`top:${paperTop + insetY}px`);
      else styles.push(`bottom:${-(printGuide.bottom - insetY)}px`);
      return styles.join(';');
    };
    const items = [];
    if (
      print.runningHead.enabled &&
      print.runningHead.content !== 'none' &&
      !(print.runningHead.hideOnFirst && printEntryIndex === 0)
    ) {
      items.push({
        kind: 'head',
        text:
          print.runningHead.content === 'project-title'
            ? session.project.title
            : printEntry.page?.title ?? session.project.title,
        style: positionStyle(print.runningHead.position)
      });
    }
    if (printEntry.visibleNumber) {
      const total = printPages.filter((entry) => entry.kind === 'page').length;
      items.push({
        kind: 'folio',
        text: formatPageNumber(printEntry.number, total, print.numbering.format),
        style: positionStyle(print.numbering.position)
      });
    }
    return items;
  });
  let lastProjectId = '';


  $effect(() => {
    fontState.version;
    if (session.project) void ensureProjectFonts(session.project);
  });

  $effect(() => {
    if (!wrapEl) return;
    const observer = new ResizeObserver(([entry]) => {
      wrapW = entry.contentRect.width;
      wrapH = entry.contentRect.height;
    });
    observer.observe(wrapEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    textMeasureKey;
    fontState.version;
    if (!stageEl || !session.project) return;
    queueMicrotask(() => {
      if (!stageEl) return;
      const scale = stage.width / (editor.viewportWidth || stage.width);
      for (const element of elements) {
        if (element.type !== 'text' || element.hidden) continue;
        const node = stageEl.querySelector(
          `[data-element-id="${CSS.escape(element.id)}"] .text-content`
        );
        if (!node) continue;
        const contentHeight = node.offsetHeight * scale;
        const padding = (element.padding || 0) * 2;
        const oneLine = element.fontSize * element.lineHeight;
        fitTextHeight(element.id, Math.max(oneLine, contentHeight) + padding);
      }
    });
  });

  function clampZoom(value) {
    return Math.min(4, Math.max(0.1, Math.round(value * 100) / 100));
  }

  function setZoom(next) {
    zoom = clampZoom(next);
    fitMode = 'manual';
  }

  function fitWidth() {
    fitMode = 'width';
  }

  function fitPage() {
    fitMode = 'page';
  }

  function applyFit() {
    if (!wrapW || !wrapH || !viewportWidth) return;
    const baseWidth = printFrame?.baseWidth ?? viewportWidth;
    const baseHeight = printFrame?.baseHeight ?? stageHeight;
    if (fitMode === 'width') zoom = clampZoom((wrapW - 48) / baseWidth);
    else if (fitMode === 'page') {
      zoom = clampZoom(Math.min((wrapW - 48) / baseWidth, (wrapH - 48) / baseHeight));
    }
  }

  $effect(() => {
    const projectId = session.project?.id ?? '';
    if (projectId === lastProjectId) return;
    lastProjectId = projectId;
    if (stage.width) editor.viewportWidth = stage.width;
    editor.showPrintMargins = Boolean(session.project?.print);
    fitMode = 'width';
  });

  $effect(() => {
    wrapW;
    wrapH;
    viewportWidth;
    stageHeight;
    printFrame;
    fitMode;
    applyFit();
  });

  $effect(() => {
    if (stage.maxWidth && editor.viewportWidth > stage.maxWidth) {
      editor.viewportWidth = stage.maxWidth;
    }
  });

  function changeViewport(width) {
    setViewportWidth(width);
    fitMode = 'width';
  }

  $effect(() => {
    if (editing && textarea) {
      queueMicrotask(() => textarea?.focus());
    }
  });

  function cssVars(element) {
    const vars = elementToCss(element, stage);
    return Object.entries(vars)
      .map(([key, value]) => `${key}:${value}`)
      .join(';');
  }

  function textStyle(element) {
    const font = fontStack(session.project, element.font);
    return [
      cssVars(element),
      `font-family:${font}`,
      `font-size:${pxToCqw(element.fontSize, stage.width)}`,
      `line-height:${element.lineHeight}`,
      `letter-spacing:${pxToCqw(element.letterSpacing, stage.width)}`,
      `color:${element.color}`,
      `text-align:${element.align}`,
      `background:${element.background || 'transparent'}`,
      `padding:${pxToCqw(element.padding || 0, stage.width)}`,
      `font-weight:${element.heading ? 700 : 400}`
    ].join(';');
  }


  function stagePoint(event) {
    if (!stageEl) return { x: 0, y: 0 };
    const rect = stageEl.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * stage.width,
      y: ((event.clientY - rect.top) / rect.height) * stage.height
    };
  }

  function clearPointer() {
    pointerState = null;
    clearGuides();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', clearPointer);
  }

  function onPointerMove(event) {
    try {
      handlePointerMove(event);
    } catch (error) {
      clearPointer();
      toast(error instanceof Error ? error.message : String(error), 'error');
    }
  }

  function handlePointerMove(event) {
    if (!pointerState) return;
    const point = stagePoint(event);

    if (pointerState.mode === 'move') {
      const primaryStart = pointerState.frames.get(pointerState.primaryId);
      if (!primaryStart) return;
      const raw = {
        ...primaryStart,
        x: primaryStart.x + (point.x - pointerState.start.x),
        y: primaryStart.y + (point.y - pointerState.start.y)
      };
      const result = snapMove(raw, stage, pointerState.others, {
        enabled: editor.snap && !event.altKey,
        threshold: 6
      });
      if (gridSnapping && !event.altKey) {
        const snapped = snapFrameMove(result.frame, activeGrid, stage, 8);
        result.frame.x = snapped.x;
        result.frame.y = snapped.y;
      }
      setGuides(result.guides.x, result.guides.y);
      const dx = result.frame.x - primaryStart.x;
      const dy = result.frame.y - primaryStart.y;
      if (dx !== pointerState.lastDx || dy !== pointerState.lastDy) {
        moveElements(
          pointerState.ids,
          dx - pointerState.lastDx,
          dy - pointerState.lastDy,
          {
            coalesceKey: `move:${pointerState.ids.join(',')}`
          }
        );
        pointerState.lastDx = dx;
        pointerState.lastDy = dy;
      }
      return;
    }

    if (pointerState.mode === 'resize') {
      const local = pointToLocal(point, pointerState.frame);
      let frame = resizeRotatedFrame(pointerState.frame, pointerState.handle, local, {
        keepAspect: event.shiftKey,
        minSize: 24
      });
      if (gridSnapping && !event.altKey) {
        const snapped = snapFrameResize(frame, pointerState.handle, activeGrid, stage, 8);
        if (snapped.w >= 24 && snapped.h >= 24) frame = snapped;
      }
      updateElement(
        pointerState.id,
        { frame },
        {
          coalesceKey: `resize:${pointerState.id}`
        }
      );
      return;
    }

    if (pointerState.mode === 'rotate') {
      const frame = rotateFrame(pointerState.frame, point, event.shiftKey ? 0 : 15);
      updateElement(
        pointerState.id,
        { frame: { rotation: frame.rotation } },
        {
          coalesceKey: `rotate:${pointerState.id}`
        }
      );
    }
  }

  function beginPointer(next) {
    pointerState = next;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', clearPointer, { once: true });
  }

  function startDrag(event, element) {
    if (event.button !== 0 || element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(element.id, { additive: event.shiftKey });
    if (!session.selectedElementIds.includes(element.id)) return;
    const chosen = selectedElements();
    beginPointer({
      mode: 'move',
      start: stagePoint(event),
      primaryId: element.id,
      ids: chosen.map((item) => item.id),
      frames: new Map(chosen.map((item) => [item.id, { ...item.frame }])),
      others: elements
        .filter((item) => !chosen.some((picked) => picked.id === item.id))
        .map((item) => item.frame),
      lastDx: 0,
      lastDy: 0
    });
  }

  function startResize(event, handle) {
    if (!primary || primary.locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    beginPointer({
      mode: 'resize',
      id: primary.id,
      handle,
      frame: { ...primary.frame }
    });
  }

  function startRotate(event) {
    if (!primary || primary.locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    beginPointer({ mode: 'rotate', id: primary.id, frame: { ...primary.frame } });
  }

  function onStagePointerDown(event) {
    if (event.target !== event.currentTarget) return;
    const target = event.target;
    if (target.classList.contains('element')) return;
    if (editor.editingElementId) commitText();

    if (placing && placementAsset) {
      const point = stagePoint(event);
      const frame = mediaFrame(placementAsset, stage, page?.elements.length ?? 0);
      frame.x = Math.min(Math.max(0, point.x - frame.w / 2), stage.width - frame.w);
      frame.y = Math.min(Math.max(0, point.y - frame.h / 2), stage.height - frame.h);
      if (gridSnapping && !event.altKey) {
        const snapped = snapFrameMove(frame, activeGrid, stage, 8);
        frame.x = snapped.x;
        frame.y = snapped.y;
      }
      try {
        addElement(placementAsset.kind, { assetId: placementAsset.id, frame });
      } catch (error) {
        toast(error instanceof Error ? error.message : String(error), 'error');
      }
      return;
    }

    selectElement(null);
  }

  function startTextEdit(event, element) {
    if (element.type !== 'text' || element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(element.id);
    beginTextEdit(element);
  }

  function commitText() {
    const element = editing;
    if (element) {
      const text = editor.textDraft;
      if (text !== element.text) {
        updateElement(element.id, { text }, { coalesceKey: `text:${element.id}` });
      }
    }
    endTextEdit();
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
</script>

<section class="desk" aria-label={t('canvas.title')}>
  <div class="stage-wrap" bind:this={wrapEl}>
    <div class="stage-pad" style:width={`${padWidth}px`} style:height={`${padHeight}px`}>
      <div class="stage-scale" style:width={`${displayWidth}px`} style:height={`${displayHeight}px`}>
      <div
        class="stage"
        bind:this={stageEl}
        style:aspect-ratio={`${stage.width} / ${stage.height}`}
        style:width={`${viewportWidth}px`}
        style:height={`${stageHeight}px`}
        style:transform={`scale(${zoom})`}
        style:--stage-color={pageBackground}
        style:--link-accent={session.project?.palette?.[2] ?? '#a82a1e'}
        class:placing
        onpointerdown={onStagePointerDown}
        role="application"
        aria-label={page ? page.title : t('canvas.title')}
      >
        {#if elements.length === 0}
          <div class="empty-stage">
            <Icon name="text" size={26} />
            <strong>{t('canvas.emptyTitle')}</strong>
            <span>{t('canvas.emptyHint')}</span>
          </div>
        {/if}

        {#if activeGrid && session.project?.gridSettings?.show}
          <GridOverlay grid={activeGrid} {stage} />
        {/if}

        {#each elements as element, index (element.id)}
          {#if !element.hidden}
            <div
              class="element element--{element.type}"
              class:selected={session.selectedElementIds.includes(element.id)}
              class:has-link={Boolean(element.link && element.link.kind !== 'none')}
              class:locked={element.locked}
              class:element--composition-button={element.type === 'composition' && element.composition?.preset === 'button'}
              style={element.type === 'text' ? textStyle(element) : cssVars(element)}
              data-element-id={element.id}
              role="button"
              tabindex="0"
              aria-label={elementName(element, index)}
              aria-pressed={session.selectedElementIds.includes(element.id)}
              onpointerdown={(event) => startDrag(event, element)}
              ondblclick={(event) => startTextEdit(event, element)}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectElement(element.id);
                }
              }}
            >
              {#if element.type === 'text'}
                <div class="text-content">{element.text}</div>
              {:else if element.type === 'drawing' && element.drawingId && session.project.drawings?.[element.drawingId]}
                <LiveDrawing
                  project={session.project}
                  drawingId={element.drawingId}
                  fit={element.fit}
                  alt={element.alt}
                  pixelated={element.pixelated}
                />
              {:else if element.type === 'image' || element.type === 'drawing'}
                <CanvasAsset
                  projectId={session.project.id}
                  assetId={element.assetId}
                  fit={element.fit}
                  alt={element.alt}
                  pixelated={element.pixelated}
                  mask={element.mask}
                  maskCurve={element.maskCurve}
                />
              {:else if element.type === 'video'}
                <CanvasVideo
                  projectId={session.project.id}
                  assetId={element.assetId}
                  fit={element.fit}
                  muted={element.muted}
                  loop={element.loop}
                />
              {:else if element.type === 'audio'}
                <CanvasAudio
                  projectId={session.project.id}
                  assetId={element.assetId}
                  label={element.label || session.project.assets?.[element.assetId]?.name || ''}
                  loop={element.loop}
                  controls={element.controls !== false}
                />
              {:else if element.type === 'html'}
                <CanvasHtml
                  projectId={session.project.id}
                  assetId={element.assetId}
                  title={element.title || element.caption || 'HTML'}
                />
              {:else if element.type === 'embed'}
                <CanvasEmbed
                  provider={element.provider}
                  title={element.title}
                  caption={element.caption}
                  url={element.url}
                />
              {:else if element.type === 'shape'}
                <ShapeArt
                  shape={element.shape}
                  fill={element.fill}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                  radius={element.radius}
                  aspect={element.frame.w / element.frame.h}
                />
              {:else if element.type === 'composition'}
                <CompositionPreview
                  project={session.project}
                  composition={element.composition}
                  aspect={element.frame.w / element.frame.h}
                />
              {:else if element.type === 'fichaCollection'}
                <CanvasFichaCollection project={session.project} {element} />
              {:else if element.type === 'ficha'}
                <CanvasFicha
                  projectId={session.project.id}
                  record={session.project.fichas?.[element.fichaId]}
                  asset={session.project.assets?.[
                    session.project.fichas?.[element.fichaId]?.assetId
                  ]}
                />
              {:else}
                <div class="text-content">{t('canvas.unsupported')}</div>
              {/if}
            </div>
          {/if}
        {/each}

        {#if primary}
          <SelectionFrame
            style={cssVars(primary)}
            locked={primary.locked}
            onresize={startResize}
            onrotate={startRotate}
          />
        {/if}

        {#if editor.guides.x !== null}
          <span
            class="guide guide--x"
            style:left={`${(editor.guides.x / stage.width) * 100}%`}
          ></span>
        {/if}
        {#if editor.guides.y !== null}
          <span
            class="guide guide--y"
            style:top={`${(editor.guides.y / stage.height) * 100}%`}
          ></span>
        {/if}

        {#if editing}
          <TextEditor
            bind:value={editor.textDraft}
            bind:textarea
            style={textStyle(editing)}
            background={textEditorBackground(editing.color)}
            caretColor={editing.color}
            oncommit={commitText}
            onkeydown={handleTextKeydown}
          />
        {/if}
      </div>
      {#if printGuide}
        <div
          class="print-guide-paper"
          style:left={`${-printGuide.left}px`}
          style:top={`${-printGuide.top}px`}
          style:width={`${printGuide.width}px`}
          style:height={`${printGuide.height}px`}
        ></div>
        <div class="print-guide-content"></div>
        {#each printParatext as item, index (item.kind)}
          <span
            class="print-guide-paratext"
            class:head={item.kind === 'head'}
            style={item.style}
          >{item.text}</span>
        {/each}
      {/if}
      </div>
    </div>
  </div>

  <div class="stage-foot">
    <span>{Math.round(stage.width)} × {Math.round(stage.height)}</span>
    <span>{plural(elements.length, 'units.elementOne', 'units.elementMany')}</span>
    <ZoomControls
      {zoom}
      viewport={viewportWidth}
      {viewportOptions}
      onviewport={changeViewport}
      onZoomOut={() => setZoom(zoom - 0.1)}
      onZoomIn={() => setZoom(zoom + 0.1)}
      onFitWidth={fitWidth}
      onFitPage={fitPage}
      fitWidthActive={fitMode === 'width'}
      fitPageActive={fitMode === 'page'}
      onActualSize={() => setZoom(1)}
      actualSizeActive={fitMode === 'manual' && Math.abs(zoom - 1) < 0.005}
    />
    <span class="page-index">
      {String(pageIndex + 1).padStart(2, '0')}
      / {String(session.project?.pages.length ?? 0).padStart(2, '0')}
    </span>
  </div>
</section>

<style>
  .desk {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--motif-desk);
  }

  .stage-wrap {
    flex: 1;
    min-height: 0;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--line-soft) transparent;
  }

  .stage-pad {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .stage.placing {
    cursor: crosshair;
  }

  .stage-scale {
    position: relative;
    flex: 0 0 auto;
  }

  .print-guide-paper,
  .print-guide-content {
    position: absolute;
    pointer-events: none;
  }

  .print-guide-paper {
    border: 1px dashed var(--muted);
  }

  .print-guide-content {
    inset: 0;
    border: 1px dashed var(--accent);
  }

  .print-guide-paratext {
    position: absolute;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 8.5pt;
    line-height: 1;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0.85;
    font-variant-numeric: tabular-nums;
  }

  .print-guide-paratext.head {
    font-family: var(--font-ui);
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .stage {
    position: relative;
    overflow: hidden;
    transform-origin: top left;
    border: 0;
    background: var(--stage-color);
    box-shadow: inset 0 0 0 var(--border-strong) var(--line), var(--shadow-stage);
    container-type: size;
    touch-action: none;
    user-select: none;
  }

  .element {
    position: absolute;
    left: var(--x);
    top: var(--y);
    z-index: var(--z);
    width: var(--w);
    height: var(--h);
    transform: rotate(var(--rot));
    opacity: var(--opacity);
    cursor: grab;
  }

  .element:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .element--composition-button {
    cursor: pointer;
  }

  .element.selected {
    outline: 2px solid var(--selection);
    outline-offset: 0;
  }

  .element.has-link {
    transition: filter 160ms ease, opacity 160ms ease;
  }

  .element.has-link:hover {
    filter: brightness(1.1);
  }

  .element--text.has-link:hover,
  .element--text.has-link:focus-within {
    opacity: 0.86;
  }

  .element--text.has-link:hover .text-content,
  .element--text.has-link:focus-within .text-content {
    text-decoration: underline;
    text-decoration-color: var(--link-accent, var(--selection));
    text-decoration-thickness: max(1px, 0.08em);
    text-underline-offset: 0.16em;
  }

  .element.locked {
    cursor: not-allowed;
  }

  .element.locked.selected {
    outline-style: dashed;
  }

  .text-content {
    width: 100%;
    height: auto;
    overflow: visible;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    pointer-events: none;
  }

  .element--image,
  .element--video {
    overflow: hidden;
  }

  .element--audio {
    overflow: visible;
  }

  .element--embed {
    overflow: hidden;
  }

  .element--shape {
    overflow: visible;
  }

  .element--ficha {
    overflow: visible;
  }

  .guide {
    position: absolute;
    z-index: 90;
    background: var(--guide);
    pointer-events: none;
  }

  .guide--x {
    top: 0;
    bottom: 0;
    width: 1px;
  }

  .guide--y {
    left: 0;
    right: 0;
    height: 1px;
  }


  .empty-stage {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    color: var(--muted);
    pointer-events: none;
    text-align: center;
  }

  .empty-stage strong {
    color: var(--ink);
    font-family: var(--font-wordmark);
    font-size: var(--text-xl);
    font-weight: var(--wordmark-weight);
  }

  .empty-stage span {
    max-width: 32ch;
    font-size: var(--text-xs);
    line-height: 1.4;
  }

  .stage-foot {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: 0 var(--space-4) var(--space-3);
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .page-index {
    margin-left: 0;
  }
</style>
