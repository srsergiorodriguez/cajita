// @ts-check

import { MiniGif } from './gif.js';
import {
  DRAWING_DEFAULT_FRAME_MS,
  DRAWING_FRAMES,
  DRAWING_HEIGHT,
  DRAWING_OUTPUT_SIZE,
  DRAWING_WIDTH,
  frameToRgba,
  paletteRgb,
  renderDrawingFrames,
  renderFrameIndices,
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
  const sourceWidth = drawing.width || DRAWING_WIDTH;
  const sourceHeight = drawing.height || DRAWING_HEIGHT;
  const outputWidth = Math.max(
    1,
    Math.round((outputSize * sourceWidth) / Math.max(sourceWidth, sourceHeight)),
  );
  const outputHeight = Math.max(
    1,
    Math.round((outputSize * sourceHeight) / Math.max(sourceWidth, sourceHeight)),
  );
  const authored = drawing.animation?.frames ?? [];
  const wiggleCount = drawing.animated !== false ? DRAWING_FRAMES : 1;
  const frames = authored.length ? [] : renderDrawingFrames(drawing);
  const gif = new MiniGif({
    customPalette: paletteRgb(projectColors),
    delay: drawing.delay,
    dither: false,
    transparent: drawing.transparent === true,
    transparentIndex: 0,
  });

  if (authored.length) {
    for (let frameIndex = 0; frameIndex < authored.length; frameIndex += 1) {
      const frame = authored[frameIndex];
      const delay = Math.max(
        2,
        Math.round((Number(frame.duration) || DRAWING_DEFAULT_FRAME_MS) / 10 / wiggleCount),
      );
      for (let variant = 0; variant < wiggleCount; variant += 1) {
        const indices = renderFrameIndices(drawing, frameIndex * wiggleCount + variant);
        const rgba = frameToRgba(
          indices,
          projectColors,
          outputWidth,
          outputHeight,
          sourceWidth,
          sourceHeight,
          null,
          drawing.transparent === true,
        );
        gif.addFramePixels(rgba, outputWidth, outputHeight, delay);
      }
    }
  } else {
    for (const frame of frames) {
      const rgba = frameToRgba(
        frame,
        projectColors,
        outputWidth,
        outputHeight,
        sourceWidth,
        sourceHeight,
        null,
        drawing.transparent === true,
      );
      gif.addFramePixels(rgba, outputWidth, outputHeight);
    }
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
