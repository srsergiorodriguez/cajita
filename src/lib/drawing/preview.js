import { frameToRgba, renderFrameIndices } from './model.js';

export function drawingFrameDataUrl(project, drawing, frame = 0) {
  if (!drawing) return '';
  const width = drawing.width || 128;
  const height = drawing.height || 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const indices = renderFrameIndices(drawing, frame);
  const rgba = frameToRgba(
    indices,
    project.palette ?? [],
    width,
    height,
    width,
    height,
    null,
    drawing.transparent === true
  );
  context.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toDataURL('image/png');
}
