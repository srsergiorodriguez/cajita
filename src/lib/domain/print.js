export const PAPER_PRESETS = Object.freeze([
  { id: 'a5', label: 'A5', width: 148, height: 210 },
  { id: 'a4', label: 'A4', width: 210, height: 297 },
  { id: 'letter', label: 'Letter', width: 215.9, height: 279.4 },
  { id: 'half-letter', label: 'Half Letter', width: 139.7, height: 215.9 }
]);

export const DEFAULT_PRINT_MARGINS = Object.freeze({
  top: 12,
  bottom: 12,
  inner: 16,
  outer: 10
});

export function normalisePrint(print = {}) {
  const paper =
    PAPER_PRESETS.find((item) => item.id === print.paper?.preset) ?? PAPER_PRESETS[0];
  const margins = {
    ...DEFAULT_PRINT_MARGINS,
    ...(print.margins ?? {})
  };
  return {
    paper: {
      preset: paper.id,
      width: Number(print.paper?.width) || paper.width,
      height: Number(print.paper?.height) || paper.height,
      unit: 'mm'
    },
    orientation: print.orientation === 'landscape' ? 'landscape' : 'portrait',
    margins: {
      top: Number(margins.top) || 0,
      bottom: Number(margins.bottom) || 0,
      inner: Number(margins.inner) || 0,
      outer: Number(margins.outer) || 0,
      unit: 'mm'
    }
  };
}

export function printContentSize(print) {
  const settings = normalisePrint(print);
  const portrait = settings.orientation !== 'landscape';
  const paperWidth = portrait ? settings.paper.width : settings.paper.height;
  const paperHeight = portrait ? settings.paper.height : settings.paper.width;
  const width = paperWidth - settings.margins.inner - settings.margins.outer;
  const height = paperHeight - settings.margins.top - settings.margins.bottom;
  if (!(width > 0) || !(height > 0)) {
    throw new Error('Los márgenes dejan un área de impresión vacía.');
  }
  return { width, height, ratio: width / height };
}

export function createPrintStage(print, width = 1200) {
  const content = printContentSize(print);
  const stageWidth = Math.max(320, Math.round(width));
  return {
    width: stageWidth,
    height: Math.max(320, Math.round(stageWidth / content.ratio)),
    fit: 'width',
    align: 'center',
    minWidth: 360,
    maxWidth: stageWidth,
    background: { color: '#fffdf7' }
  };
}
