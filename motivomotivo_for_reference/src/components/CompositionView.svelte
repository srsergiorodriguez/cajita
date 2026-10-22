<script>
  import { onMount } from 'svelte';
  import * as d3 from "d3";
  import { appState } from '$stores/appState.svelte.js';
  import { calculateTextLines } from '$lib/textEngine.js';
  import CellRenderer from '$components/CellRenderer.svelte';
  
  import CompositionToolbar from '$components/CompositionToolbar.svelte';

  // --- DOM & State Bindings ---
  let svgElement;
  let zoomGroupElement; 
  let zoomBehavior;
  let zoomLevel = $state(1); 
  let zoomEnabled = $state(true);

  onMount(() => {
    if (!svgElement) return;
    setupZoom();
    fitToScreen();
  });

  // --- D3 Zoom & Pan Engine ---
  function setupZoom() {
    const svg = d3.select(svgElement);
    zoomBehavior = d3.zoom()
      .scaleExtent([0.2, 5])
      .filter((event) => {
        if (appState.selectionMode === 'multiple') {
          if (event.type === 'mousedown' || event.type === 'touchstart' || event.type === 'pointerdown') {
            return false;
          }
        }
        return !event.ctrlKey && !event.button;
      })
      .on('zoom', (event) => {
        if (zoomEnabled) {
          zoomLevel = event.transform.k;
          d3.select(zoomGroupElement).attr('transform', event.transform);
        }
      });
    
    updateZoomBehavior();
  }

  function updateZoomBehavior() {
    const svg = d3.select(svgElement);
    if (zoomEnabled) svg.call(zoomBehavior);
    else svg.on('.zoom', null);
  }

  function zoomIn() { if (svgElement && zoomBehavior) d3.select(svgElement).transition().call(zoomBehavior.scaleBy, 1.2); }
  function zoomOut() { if (svgElement && zoomBehavior) d3.select(svgElement).transition().call(zoomBehavior.scaleBy, 0.8); }
  function resetZoom() { if (svgElement && zoomBehavior) d3.select(svgElement).transition().call(zoomBehavior.transform, d3.zoomIdentity); }

  function fitToScreen() {
    if (!svgElement || !zoomBehavior) return;
    const { width, height } = svgElement.getBoundingClientRect();
    if (width === 0 || height === 0) {
      requestAnimationFrame(fitToScreen);
      return;
    }
    const scaleX = width / appState.page.width;
    const scaleY = height / appState.page.height;
    const scale = Math.min(scaleX, scaleY) * 0.95; 
    const translateX = (width - (scale * appState.page.width)) / 2;
    const translateY = (height - (scale * appState.page.height)) / 2;
    if (!isNaN(scale) && !isNaN(translateX)) {
      const svg = d3.select(svgElement);
      svg.transition().duration(0).call(
        zoomBehavior.transform, 
        d3.zoomIdentity.translate(translateX, translateY).scale(scale)
      );
    }
  }

  // --- Interactive Selection Tools ---
  let isDragging = false;
  let dragStartCell = null;

  function handlePointerDown(i, event) {
    event.stopPropagation();
    if (appState.selectionMode === 'multiple') {
      isDragging = true;
      dragStartCell = i;
      appState.selectedCells = [i];
    } else {
      if (appState.selectedCells.length === 1 && appState.selectedCells[0] === i) {
        appState.selectedCells = [];
      } else {
        appState.selectedCells = [i];
      }
    }
  }

  function handlePointerEnter(i) {
    if (!isDragging || dragStartCell === null) return;
    const startCol = dragStartCell % appState.page.divsW;
    const startRow = Math.floor(dragStartCell / appState.page.divsW);
    const endCol = i % appState.page.divsW;
    const endRow = Math.floor(i / appState.page.divsW);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const newSelection = [];
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const idx = row * appState.page.divsW + col;
        // BUGFIX: Prevent drag-select from highlighting invisible merged cells
        if (appState.getCellStatus(idx, appState.mergedBlocks).role !== 'hidden') {
          newSelection.push(idx);
        }
      }
    }
    appState.selectedCells = newSelection;
  }

  function handlePointerUp() {
    isDragging = false;
    dragStartCell = null;
  }

  let lastWidth = 0;
  let lastDivsW = 0;

  $effect(() => {
    const currentWidth = appState.page.width;
    const currentDivsW = appState.page.divsW;
    if (currentWidth && currentDivsW) {
      if (currentWidth !== lastWidth || currentDivsW !== lastDivsW) {
        setTimeout(fitToScreen, 10); 
        lastWidth = currentWidth;
        lastDivsW = currentDivsW;
      }
    }
  });
</script>

<svelte:window onresize={() => fitToScreen()} onpointerup={handlePointerUp}/>

<div class="canvas-space-container">  
  <CompositionToolbar {zoomLevel} {zoomIn} {zoomOut} {resetZoom} {fitToScreen} />

  <div class="canvas-container">
    <svg bind:this={svgElement} width="100%" height="100%" onpointerdown={() => appState.selectedCells = []}>
      <defs>
        {#each Array(appState.page.divsW) as _, s}
          <clipPath id="cell-clip-{s + 1}">
            <rect x="0" y="0" width={appState.page.cellSize * (s + 1)} height={appState.page.cellSize * (s + 1)} />
          </clipPath>
        {/each}
        <clipPath id="page-clip">
          <rect x="0" y="0" width={appState.page.width} height={appState.page.height} />
        </clipPath>
      </defs>

      <g bind:this={zoomGroupElement} class="zoom-group">
        <g clip-path="url(#page-clip)">
          <rect width={appState.page.width} height={appState.page.height} fill={appState.bgColor} stroke="none" />

          <g transform="translate({appState.page.margin.l}, {appState.page.margin.t})">

            {#each appState.gridData as cell, i}
              {@const status = appState.getCellStatus(i, appState.mergedBlocks)}
              
              {#if status.role !== 'hidden'}
                {@const span = status.role === 'anchor' ? status.span : 1}
                {@const currentCellSize = appState.page.cellSize * span}
                {@const xPos = (i % appState.page.divsW) * appState.page.cellSize}
                {@const yPos = Math.floor(i / appState.page.divsW) * appState.page.cellSize}
                
                <g transform="translate({xPos}, {yPos})">
                  <g clip-path="url(#cell-clip-{span})">
                    <g transform="scale({span})">
                      <CellRenderer code={cell} cellSize={appState.page.cellSize} palette={appState.palette} />
                    </g>
                  </g>
                  
                  <rect
                    class="interactive-layer"
                    x="0" y="0" width={currentCellSize} height={currentCellSize}
                    fill={appState.selectedCells.includes(i) ? "rgba(0, 150, 255, 0.2)" : "transparent"}
                    stroke={appState.showGrid ? "#b0b0bf" : "transparent"}
                    stroke-width="1" stroke-dasharray="10 20"
                    style="cursor: pointer; transition: fill 0.2s ease;"
                    onpointerdown={(e) => handlePointerDown(i, e)}
                    onpointerenter={() => handlePointerEnter(i)}
                  />
                </g>
              {/if}
            {/each}

            {#each Object.entries(appState.imageData || {}) as [indexStr, block]}
              {@const index = parseInt(indexStr)}
              {@const status = appState.getCellStatus(index, appState.mergedBlocks)}
              {@const anchorSpan = status.role === 'anchor' ? status.span : 1}
              {@const col = index % appState.page.divsW}
              {@const row = Math.floor(index / appState.page.divsW)}
              {@const rawX = col * appState.page.cellSize}
              {@const rawY = row * appState.page.cellSize}
              {@const effectiveSpanW = Math.max(block.spanW, anchorSpan)}
              {@const effectiveSpanH = Math.max(block.spanH, anchorSpan)}
              {@const rawWidth = effectiveSpanW * appState.page.cellSize}
              {@const rawHeight = effectiveSpanH * appState.page.cellSize}
              {@const padPercent = block.padding || 0}
              {@const padPx = (padPercent / 100) * appState.page.cellSize}
              {@const imgX = rawX + padPx}
              {@const imgY = rawY + padPx}
              {@const imgW = Math.max(0, rawWidth - (padPx * 2))}
              {@const imgH = Math.max(0, rawHeight - (padPx * 2))}
              {@const alignAspect = (block.align === 'start') ? "xMinYMin meet" : "xMidYMid meet"}
              
              <g>
                <image href={block.src} x={imgX} y={imgY} width={imgW} height={imgH} preserveAspectRatio={alignAspect} style="pointer-events: none; user-select: none;" />
                {#if appState.selectedCells.includes(index)}
                  <rect class="image-debug" x={imgX} y={imgY} width={imgW} height={imgH} fill="none" stroke={appState.showGrid ? "#00d084" : "transparent"} stroke-width="2" stroke-dasharray="5" />
                {/if}
              </g>
            {/each}

            {#each Object.entries(appState.textData) as [indexStr, block]}
              {@const index = parseInt(indexStr)}
              {@const status = appState.getCellStatus(index, appState.mergedBlocks)}
              {@const anchorSpan = status.role === 'anchor' ? status.span : 1}

              {@const col = index % appState.page.divsW}
              {@const row = Math.floor(index / appState.page.divsW)}
              
              {@const xPos = col * appState.page.cellSize + (anchorSpan * appState.page.cellSize / 2)}
              {@const yPos = row * appState.page.cellSize + (anchorSpan * appState.page.cellSize / 2)}
              
              {@const layoutWidth = (block.span - 1) * appState.page.cellSize}
              {@const wrapWidth = Math.max(10, layoutWidth)}
              
              {@const currentLeading = block.leading ?? 1.2}
              {@const lines = calculateTextLines(block.content, wrapWidth, block.size, block.font, currentLeading)}
              {@const lineHeight = block.size * currentLeading}
              {@const totalHeight = lines.length * lineHeight}
              {@const transform = block.dir === 'vertical' ? `translate(${xPos}, ${yPos}) rotate(90)` : `translate(${xPos}, ${yPos})`}
              
              <g transform="{transform}">
                <text fill={appState.palette[block.colorIndex]} font-family={block.font} font-size="{block.size}px" text-anchor={block.align === 'center' ? 'middle' : block.align === 'right' ? 'end' : 'start'} style="white-space: pre; pointer-events: none; user-select: none;">
                  {#each lines as line}
                    {@const alignOffsetX = block.align === 'center' ? layoutWidth / 2 : block.align === 'right' ? layoutWidth : 0}
                    <tspan x={alignOffsetX} y={line.y}>{line.text}</tspan>
                  {/each}
                </text>
                {#if appState.selectedCells.includes(index)}
                  <rect class="text-debug" x="0" y={-(block.size * 0.5)} width={Math.max(2, layoutWidth)} height={totalHeight} fill="none" stroke={appState.showGrid ? "#f73657" : "transparent"} stroke-dasharray="5" />
                  <circle class="text-debug" cx="0" cy="0" r="4" fill={appState.showGrid ? "#3842ff" : "transparent"} />
                {/if}
              </g>
            {/each}

          </g>
        </g>

        {#if appState.showBatchOverlay}
          <g class="batch-coordinates" fill="black" font-family="monospace" font-size="34px" font-weight="bold">
            {#each Array(appState.page.divsW) as _, x}
              <text x={appState.page.margin.l + (x * appState.page.cellSize) + (appState.page.cellSize / 2)} y={Math.max(16, appState.page.margin.t - 10)} stroke="white" stroke-width="10" paint-order="stroke" text-anchor="middle">{x}</text>
            {/each}
            {#each Array(appState.page.divsH) as _, y}
              <text x={Math.max(16, appState.page.margin.l - 12)} y={appState.page.margin.t + (y * appState.page.cellSize) + (appState.page.cellSize / 2) + 5} stroke="white" stroke-width="10" paint-order="stroke" text-anchor="end">{y}</text>
            {/each}
          </g>
        {/if}

      </g>
    </svg>
  </div>
</div>

<style>
  .canvas-space-container {
    box-sizing: border-box;
    display: flex;
    flex: 1;
    flex-direction: column;
    border: solid 1px var(--sl-color-neutral-300); 
    background-color: var(--sl-color-neutral-50);
  }

  .canvas-container {
    box-sizing: border-box;
    display: flex;
    flex: 1;
    overflow: hidden; 
  }
</style>