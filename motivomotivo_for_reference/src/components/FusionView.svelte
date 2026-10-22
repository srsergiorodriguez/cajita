<script>
  // --- Imports & State ---
  import { appState } from '$stores/appState.svelte.js';
  import { FUSION_EFFECTS } from '$lib/fusionEngine.js'; 
  import { calculateTextLines } from '$lib/textEngine.js';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

  let canvasElement;
  let isProcessing = $state(false);

  // --- Reactivity ---
  $effect(() => {
    const stateFingerprint = JSON.stringify({
      data: appState.gridData,
      text: appState.textData,
      image: appState.imageData,
      page: appState.page,
      bg: appState.bgColor,
      palette: appState.palette,
      pack: appState.shapePack,
      active: appState.effects.active,
      values: appState.effects.values,
      textFusion: appState.textAffectedByFusion,
      imageFusion: appState.imagesAffectedByFusion,
      mergedBlocks: appState.mergedBlocks // Ensure reactivity triggers on merge/unmerge
    });

    renderRasterPreview();
  });

  // --- Rasterization Engine ---
  async function renderRasterPreview() {
    if (!canvasElement) return;
    isProcessing = true;

    const originalSvg = document.querySelector('.canvas-container svg');
    if (!originalSvg) return;

    // 1. SVG Cloning & Cleanup
    const clone = originalSvg.cloneNode(true);
    
    const bgRect = clone.querySelector('rect');
    if (bgRect) {
      bgRect.setAttribute('stroke', 'none');
      bgRect.setAttribute('stroke-width', '0');
    }
    
    const zoomGroup = clone.querySelector('.zoom-group');
    if (zoomGroup) zoomGroup.removeAttribute('transform');
    
    clone.querySelectorAll('.interactive-layer').forEach(el => el.remove());
    clone.querySelectorAll('.text-debug').forEach(el => el.remove());
    clone.querySelectorAll('.image-debug').forEach(el => el.remove());
    clone.querySelectorAll('text').forEach(el => el.remove());

    if (!appState.imagesAffectedByFusion) {
      clone.querySelectorAll('image').forEach(el => el.remove());
    }

    clone.setAttribute('width', appState.page.width);
    clone.setAttribute('height', appState.page.height);
    clone.setAttribute('viewBox', `0 0 ${appState.page.width} ${appState.page.height}`);
    
    let svgData = new XMLSerializer().serializeToString(clone);
    if (!svgData.includes('xmlns=')) {
      svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const overlayImages = {};
    if (!appState.imagesAffectedByFusion) {
      const promises = Object.entries(appState.imageData).map(([indexStr, block]) => {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve({ index: indexStr, img });
          img.src = block.src;
        });
      });
      const loaded = await Promise.all(promises);
      loaded.forEach(item => overlayImages[item.index] = item.img);
    }

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
      canvasElement.width = appState.page.width;
      canvasElement.height = appState.page.height;
      
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      ctx.filter = 'none';

      // 2. Draw the Base Geometric SVG
      ctx.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);

      // --- HELPER: Draw Typography Layer ---
      const drawTextLayer = () => {
        Object.entries(appState.textData).forEach(([indexStr, block]) => {
          const index = parseInt(indexStr);
          const status = appState.getCellStatus(index, appState.mergedBlocks);
          const anchorSpan = status.role === 'anchor' ? status.span : 1;

          const col = index % appState.page.divsW;
          const row = Math.floor(index / appState.page.divsW);

          // BUGFIX: Macro-Cell centering math applied to Canvas Context
          const xPos = appState.page.margin.l + col * appState.page.cellSize + (anchorSpan * appState.page.cellSize / 2);
          const yPos = appState.page.margin.t + row * appState.page.cellSize + (anchorSpan * appState.page.cellSize / 2);

          const layoutWidth = (block.span - 1) * appState.page.cellSize;
          const wrapWidth = Math.max(10, layoutWidth);
          const currentLeading = block.leading ?? 1.2;
          const lines = calculateTextLines(block.content, wrapWidth, block.size, block.font, currentLeading);

          ctx.save();
          ctx.translate(xPos, yPos);
          
          if (block.dir === 'vertical') {
            ctx.rotate(Math.PI / 2);
          }

          const safeFontName = block.font.replace(/['"]/g, '');
          ctx.font = `${block.size}px "${safeFontName}", sans-serif`;
          ctx.fillStyle = appState.palette[block.colorIndex];
          ctx.textBaseline = 'alphabetic'; 

          if (block.align === 'center') ctx.textAlign = 'center';
          else if (block.align === 'right') ctx.textAlign = 'right';
          else ctx.textAlign = 'left';

          lines.forEach(line => {
            let alignOffsetX = 0;
            if (block.align === 'center') alignOffsetX = layoutWidth / 2;
            if (block.align === 'right') alignOffsetX = layoutWidth;
            ctx.fillText(line.text, alignOffsetX, line.y);
          });

          ctx.restore();
        });
      };

      // 3. Conditional Draw (Under Effects)
      if (appState.textAffectedByFusion) {
        drawTextLayer();
      }

      // 4. Post-Processing Engine
      appState.effects.active.forEach(id => {
        const effect = FUSION_EFFECTS[id];
        const value = appState.effects.values[id];
        if (effect) {
          effect.apply(ctx, value, canvasElement.width, canvasElement.height);
        }
      });

      // 5. Conditional Draw Text (Over Effects)
      if (!appState.textAffectedByFusion) {
        drawTextLayer();
      }

      // 6. Draw Overlay Images (Over Effects)
      if (!appState.imagesAffectedByFusion) {
        Object.entries(appState.imageData).forEach(([indexStr, block]) => {
          const imgEl = overlayImages[indexStr];
          if (!imgEl) return;

          const index = parseInt(indexStr);
          const status = appState.getCellStatus(index, appState.mergedBlocks);
          const anchorSpan = status.role === 'anchor' ? status.span : 1;

          const col = index % appState.page.divsW;
          const row = Math.floor(index / appState.page.divsW);

          const rawX = col * appState.page.cellSize;
          const rawY = row * appState.page.cellSize;
          
          // BUGFIX: Macro-Cell sizing math applied to Canvas Context
          const effectiveSpanW = Math.max(block.spanW, anchorSpan);
          const effectiveSpanH = Math.max(block.spanH, anchorSpan);
          
          const rawWidth = effectiveSpanW * appState.page.cellSize;
          const rawHeight = effectiveSpanH * appState.page.cellSize;

          const padPercent = block.padding || 0;
          const padPx = (padPercent / 100) * appState.page.cellSize;

          // Apply global canvas margins
          const boxX = appState.page.margin.l + rawX + padPx;
          const boxY = appState.page.margin.t + rawY + padPx;
          const boxW = Math.max(0, rawWidth - (padPx * 2));
          const boxH = Math.max(0, rawHeight - (padPx * 2));

          // Emulate SVG preserveAspectRatio for Canvas
          const imgRatio = imgEl.width / imgEl.height;
          const boxRatio = boxW / boxH;
          
          let drawW = boxW;
          let drawH = boxH;
          let drawX = boxX;
          let drawY = boxY;

          if (imgRatio > boxRatio) {
            drawH = boxW / imgRatio;
            // Only push the image down if it's centered
            if (block.align !== 'start') {
              drawY += (boxH - drawH) / 2;
            }
          } else {
            drawW = boxH * imgRatio;
            // Only push the image right if it's centered
            if (block.align !== 'start') {
              drawX += (boxW - drawW) / 2;
            }
          }

          ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);
        });
      }

      URL.revokeObjectURL(url);
      isProcessing = false;
    };
    img.src = url;
  }
</script>

<div class="fusion-space-container">
  {#if isProcessing}
    <div class="loader">
      <sl-spinner></sl-spinner>
      <span>Fusing...</span>
    </div>
  {/if}

  <div class="canvas-wrapper">
    <canvas bind:this={canvasElement}></canvas>
  </div>
</div>

<style>
  .fusion-space-container {
    box-sizing: border-box;
    display: flex;
    flex: 1;
    flex-direction: column;
    position: relative;
    background-color: var(--sl-color-neutral-50);
    border: solid 1px var(--sl-color-neutral-300);
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 2rem;
  }

  .canvas-wrapper {
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    /* Set to transparent to ensure any subpixel rendering doesn't reveal a white matte background */
    background-color: transparent;
    line-height: 0;
    max-width: 100%;
    max-height: 100%;
    transition: width 0.2s ease, height 0.2s ease;
  }

  canvas {
    max-width: 100%;
    max-height: 100%;
    height: auto;
    width: auto;
    display: block;
  }

  .loader {
    position: absolute;
    top: 1rem;
    left: 1rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1.2rem;
    border-radius: var(--sl-border-radius-pill);
    background-color: var(--sl-color-neutral-0);
    box-shadow: var(--sl-shadow-large);
    font-size: 0.8rem;
    font-weight: 600;
    z-index: 10;
    border: 1px solid var(--sl-color-neutral-200);
  }
</style>