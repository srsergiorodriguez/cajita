import opentype from 'opentype.js';
import { availableFonts } from '$lib/fontManager.js';
import { appState } from '$stores/appState.svelte.js';

const fontCache = {};

async function convertTextToPaths(svgElement) {
  const textNodes = Array.from(svgElement.querySelectorAll('text'));

  for (const textNode of textNodes) {
    const fontFamily = textNode.getAttribute('font-family') || textNode.style.fontFamily;
    const fontSize = parseFloat(textNode.getAttribute('font-size') || textNode.style.fontSize || 24);
    const fill = textNode.getAttribute('fill') || textNode.style.fill;
    const textAnchor = textNode.getAttribute('text-anchor') || 'start';

    const cleanFamily = fontFamily.replace(/['"]/g, '');
    const fontMeta = availableFonts.find(f => f.family === cleanFamily);
    
    if (!fontMeta) {
      console.warn(`Font ${cleanFamily} not found. Skipping path conversion.`);
      continue;
    }

    if (!fontCache[cleanFamily]) {
      try {
        const response = await fetch(fontMeta.url);
        const buffer = await response.arrayBuffer();
        fontCache[cleanFamily] = opentype.parse(buffer);
      } catch (err) {
        console.error(`Failed to load font: ${fontMeta.url}`, err);
        continue;
      }
    }

    const font = fontCache[cleanFamily];
    const tspans = Array.from(textNode.querySelectorAll('tspan'));
    
    const groupElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    if (fill) groupElement.setAttribute('fill', fill);
    
    const transform = textNode.getAttribute('transform');
    if (transform) groupElement.setAttribute('transform', transform);

    for (const tspan of tspans) {
      const textContent = tspan.textContent;
      if (!textContent) continue;

      let x = parseFloat(tspan.getAttribute('x') || 0);
      const y = parseFloat(tspan.getAttribute('y') || 0);

      const advanceWidth = font.getAdvanceWidth(textContent, fontSize);
      
      if (textAnchor === 'middle') {
        x = x - (advanceWidth / 2);
      } else if (textAnchor === 'end') {
        x = x - advanceWidth;
      }

      const path = font.getPath(textContent, x, y, fontSize);
      const pathData = path.toPathData(2);

      const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElement.setAttribute('d', pathData);
      groupElement.appendChild(pathElement);
    }

    textNode.parentNode.replaceChild(groupElement, textNode);
  }
}

export async function getCleanSVGString() {
  const previousSelection = appState.selectedCells;
  appState.selectedCells = [];
  await new Promise(resolve => setTimeout(resolve, 0)); 

  const originalSvg = document.querySelector('.canvas-container svg');
  if (!originalSvg) throw new Error("Canvas SVG not found in DOM");

  const clone = originalSvg.cloneNode(true);
  const zoomGroup = clone.querySelector('.zoom-group');
  if (zoomGroup) zoomGroup.removeAttribute('transform');
  
  // STRIP OUT UI ELEMENTS:
  clone.querySelectorAll('.interactive-layer').forEach(el => el.remove());
  clone.querySelectorAll('.batch-coordinates').forEach(el => el.remove()); // <-- ADD THIS LINE

  clone.setAttribute('width', appState.page.width);
  clone.setAttribute('height', appState.page.height);
  clone.setAttribute('viewBox', `0 0 ${appState.page.width} ${appState.page.height}`);

  await convertTextToPaths(clone);

  appState.selectedCells = previousSelection;
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);
  if (!svgString.includes('xmlns=')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return svgString;
}

/**
 * Renders the current clean vector composition to a Uint8Array PNG.
 */
export async function generateCleanPNG() {
  const svgString = await getCleanSVGString();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const pngDataUrl = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = appState.page.width;
      canvas.height = appState.page.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });

  const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}