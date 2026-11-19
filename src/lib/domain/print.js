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
    },
    numbering: {
      enabled: print.numbering?.enabled !== false,
      start: Math.max(1, Math.round(Number(print.numbering?.start) || 1)),
      format: ['1', '01', '1 / N'].includes(print.numbering?.format)
        ? print.numbering.format
        : '1',
      hideOnFirst: print.numbering?.hideOnFirst !== false,
      position: print.numbering?.position ?? 'bottom-outer'
    },
    runningHead: {
      enabled: print.runningHead?.enabled === true,
      content: ['none', 'project-title', 'page-title'].includes(print.runningHead?.content)
        ? print.runningHead.content
        : 'page-title',
      position: print.runningHead?.position ?? 'top-outer',
      hideOnFirst: print.runningHead?.hideOnFirst !== false
    },
    toc: {
      enabled: print.toc?.enabled === true,
      title: typeof print.toc?.title === 'string' && print.toc.title.trim()
        ? print.toc.title.trim()
        : 'Contenido'
    },
    imposition: {
      mode: ['none', 'spread', 'booklet'].includes(print.imposition?.mode)
        ? print.imposition.mode
        : 'none'
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


export function formatPageNumber(number, total, format = '1') {
  if (format === '01') return String(number).padStart(2, '0');
  if (format === '1 / N') return `${number} / ${total}`;
  return String(number);
}

export function buildPrintPages(project) {
  const print = normalisePrint(project?.print ?? {});
  const pages = project?.pages ?? [];
  const entries = pages.map((page, index) => {
    const number = print.numbering.start + index;
    return {
      kind: 'page',
      page,
      index,
      number,
      visibleNumber:
        print.numbering.enabled &&
        !(print.numbering.hideOnFirst && index === 0)
    };
  });
  if (print.toc.enabled) {
    entries.unshift({
      kind: 'toc',
      page: null,
      index: null,
      number: null,
      visibleNumber: false
    });
  }
  return entries;
}


export function buildBookletSides(entries) {
  const total = Math.ceil(entries.length / 4) * 4;
  const padded = [...entries, ...Array(Math.max(0, total - entries.length)).fill(null)];
  const sides = [];
  for (let signature = 0; signature < total / 4; signature += 1) {
    const front = [padded[total - 2 * signature - 1], padded[2 * signature]];
    const back = [padded[2 * signature + 1], padded[total - 2 * signature - 2]];
    sides.push(front, back);
  }
  return sides;
}
