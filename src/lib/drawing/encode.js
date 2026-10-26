// @ts-check

import { MiniGif } from './gif.js';
import {
  DRAWING_OUTPUT_SIZE,
  frameToRgba,
  paletteRgb,
  renderDrawingFrames,
} from './model.js';

/** @typedef {import('./model.js').DrawingDoc} DrawingDoc */

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Encode the editable drawing into a looping GIF data URL. This is deliberately
 * deterministic: frames are generated from the stored strokes and seeds, not
 * from the canvas currently on screen.
 *
 * @param {DrawingDoc} drawing
 * @param {{ outputSize?: number, projectColors?: string[] }} [options]
 * @returns {{ image: string, bytes: number }}
 */
export function encodeDrawingGif(drawing, options = {}) {
  const outputSize = options.outputSize || DRAWING_OUTPUT_SIZE;
  const projectColors = options.projectColors || [];
  const frames = renderDrawingFrames(drawing);
  const gif = new MiniGif({
    customPalette: paletteRgb(projectColors),
    delay: drawing.delay,
    dither: false,
    transparent: false,
  });

  for (const frame of frames) {
    const rgba = frameToRgba(
      frame,
      projectColors,
      outputSize,
    );
    gif.addFramePixels(rgba, outputSize, outputSize);
  }

  const buffer = gif.makeGif();
  if (!buffer) {
    throw new Error('Drawing GIF encoding failed');
  }

  return {
    image: `data:image/gif;base64,${bytesToBase64(buffer)}`,
    bytes: buffer.length,
  };
}
