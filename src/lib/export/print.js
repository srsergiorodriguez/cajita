import { buildBookletSides, buildPrintPages, formatPageNumber, normalisePrint, printContentSize, PRINT_MARGIN_SIDE_INSET_MM, PRINT_MARGIN_VERTICAL_INSET_MM } from '../domain/print.js';

function extractStyle(html = '') {
  return html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function extractMain(html = '') {
  return html.match(/<main class="stage"[\s\S]*?<\/main>/)?.[0] ?? '';
}

export function buildPrintDocument(project, pages = []) {
  const print = normalisePrint(project.print ?? {});
  const content = printContentSize(print);
  const portrait = print.orientation !== 'landscape';
  const paperWidth = portrait ? print.paper.width : print.paper.height;
  const paperHeight = portrait ? print.paper.height : print.paper.width;
  const style = extractStyle(pages[0]?.html);
  const fragments = pages.map((page) => extractMain(page.html)).filter(Boolean);
  const printPages = buildPrintPages(project);
  const contentPages = printPages.filter((entry) => entry.kind === 'page');
  const total = contentPages.length;
  const toc = print.toc;
  const tocFragment = toc.enabled
    ? `<div class="print-toc" style="color:${escapeHtml(project.palette?.[1] ?? '#1c1917')}"><h1>${escapeHtml(toc.title)}</h1><ol>${contentPages
        .map(
          (entry) =>
            `<li><span>${escapeHtml(entry.page?.title ?? '')}</span><b>${formatPageNumber(entry.number, total, print.numbering.format)}</b></li>`
        )
        .join('')}</ol></div>`
    : '';
  const marginPosition = (placement, index) => {
    const [vertical, horizontal] = placement.split('-');
    const side = index % 2 === 0 ? 'right' : 'left';
    if (horizontal === 'center') {
      return `${vertical}:${PRINT_MARGIN_VERTICAL_INSET_MM}mm;left:50%;transform:translateX(-50%)`;
    }
    const horizontalSide =
      horizontal === 'inner'
        ? side === 'right' ? 'left' : 'right'
        : horizontal === 'outer'
          ? side
          : horizontal;
    return `${vertical}:${PRINT_MARGIN_VERTICAL_INSET_MM}mm;${horizontalSide}:${PRINT_MARGIN_SIDE_INSET_MM}mm`;
  };
  const folioFor = (entry, index) => {
    if (!entry?.visibleNumber) return '';
    const value = formatPageNumber(entry.number, total, print.numbering.format);
    return `<span class="print-folio" style="${marginPosition(print.numbering.position, index)}">${value}</span>`;
  };
  const runningHeadFor = (entry, index) => {
    const head = print.runningHead;
    if (!head.enabled || head.content === 'none') return '';
    if (head.hideOnFirst && index === 0) return '';
    const value =
      head.content === 'project-title'
        ? project.title
        : entry?.page?.title ?? project.title;
    return `<span class="print-running-head" style="${marginPosition(head.position, index)}">${value}</span>`;
  };
  let contentIndex = 0;
  const sheets = printPages
    .map((entry, index) => {
      const fragment = entry.kind === 'toc' ? tocFragment : fragments[contentIndex++];
      if (!fragment) return null;
      return { entry, index, fragment };
    })
    .filter(Boolean);
  const sheetHtml = (sheet, pageNumber) => {
    const page = sheet.entry?.page;
    const background =
      sheet.entry.kind === 'toc'
        ? project.siteBackground ?? project.palette?.[0] ?? '#ffffff'
        : page?.background?.color ??
          project.stage?.background?.color ??
          project.siteBackground ??
          '#ffffff';
    const innerLeft = sheet.index % 2 === 0;
    const left = innerLeft ? print.margins.inner : print.margins.outer;
    const right = innerLeft ? print.margins.outer : print.margins.inner;
    return `<section class="print-sheet" data-page="${pageNumber}" data-number="${sheet.entry?.number ?? ''}" style="width:${paperWidth}mm;height:${paperHeight}mm;padding:${print.margins.top}mm ${right}mm ${print.margins.bottom}mm ${left}mm"><div class="print-page" style="background:${background}">${sheet.fragment}</div>${sheet.entry.kind === 'page' ? runningHeadFor(sheet.entry, sheet.index) : ''}${folioFor(sheet.entry, sheet.index)}</section>`;
  };
  const blankSheet = `<section class="print-sheet print-sheet--blank" aria-hidden="true" style="width:${paperWidth}mm;height:${paperHeight}mm"></section>`;
  const mode = print.imposition.mode;
  const spread = mode === 'spread';
  let pagesHtml;
  if (mode === 'booklet') {
    const sides = buildBookletSides(sheets);
    pagesHtml = sides
      .map(
        (group, index) =>
          `<section class="print-spread print-booklet-side" data-sheet="${Math.floor(index / 2) + 1}" data-side="${index % 2 === 0 ? 'front' : 'back'}">${group.map((sheet) => (sheet ? sheetHtml(sheet, sheet.index + 1) : blankSheet)).join('')}</section>`
      )
      .join('\n');
  } else if (spread) {
    const groups = [];
    if (sheets.length) groups.push([sheets[0]]);
    for (let index = 1; index < sheets.length; index += 2) {
      groups.push([sheets[index], sheets[index + 1] ?? null]);
    }
    pagesHtml = groups
      .map(
        (group, index) =>
          `<section class="print-spread" data-sheet="${index + 1}">${group.map((sheet) => (sheet ? sheetHtml(sheet, sheet.index + 1) : blankSheet)).join('')}</section>`
      )
      .join('\n');
  } else {
    pagesHtml = sheets.map((sheet) => sheetHtml(sheet, sheet.index + 1)).join('\n');
  }

  return `<!doctype html>
<html lang="${project.locale ?? 'es'}">
<head>
<meta charset="utf-8" />
<title>${project.title ?? 'cajita'}</title>
<style>${style}</style>
<style>
@page {
  size: ${spread ? paperWidth * 2 : paperWidth}mm ${paperHeight}mm;
  margin: 0;
}
html, body { margin: 0; padding: 0; }
body { display: block; min-height: 0; }
.print-sheet {
  box-sizing: border-box;
  width: ${paperWidth}mm;
  height: ${paperHeight}mm;
  background: #fff;
  position: relative;
  overflow: hidden;
  break-inside: avoid;
}
:not(.print-spread) > .print-sheet {
  margin: 0 auto;
  break-after: page;
  page-break-after: always;
}
:not(.print-spread) > .print-sheet:last-child { break-after: auto; page-break-after: auto; }
.print-spread {
  box-sizing: border-box;
  display: flex;
  width: ${paperWidth * 2}mm;
  height: ${paperHeight}mm;
  margin: 0 auto;
  background: #fff;
  overflow: hidden;
  break-inside: avoid;
  break-after: page;
  page-break-after: always;
}
.print-spread:last-child { break-after: auto; page-break-after: auto; }
.print-spread .print-sheet { margin: 0; }
.print-spread:first-child { justify-content: flex-end; }
.print-doc--booklet .print-spread:first-child { justify-content: flex-start; }
.print-sheet--blank { background: #fff; }
.print-page {
  width: ${content.width}mm;
  height: ${content.height}mm;
  overflow: hidden;
}
@media screen {
  body { background: #24282e; }
  .print-sheet, .print-spread {
    margin: 24px auto;
    box-shadow: 0 0 0 1px #111, 0 18px 42px rgba(0, 0, 0, .35);
  }
  .print-spread .print-sheet { box-shadow: none; }
}
@media print {
  .print-sheet, .print-spread { margin: 0; box-shadow: none; }
}
.print-page .stage {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  aspect-ratio: auto !important;
  margin: 0 !important;
  box-shadow: none !important;
}
.print-page .composition-frame { display: none !important; }
.print-folio,
.print-running-head {
  position: absolute;
  z-index: 2;
  font-family: 'Space Mono', monospace;
  font-size: 8pt;
  line-height: 1;
  color: #1c1917;
}
.print-running-head { text-transform: uppercase; letter-spacing: .04em; }
.print-toc { width: 100%; height: 100%; padding: 0; font-family: 'Space Mono', monospace; color: inherit; }
.print-toc h1 { margin: 0 0 10mm; font-family: 'Fraunces', Georgia, serif; font-size: 28pt; font-weight: 400; }
.print-toc ol { margin: 0; padding: 0; list-style: none; }
.print-toc li { display: flex; justify-content: space-between; gap: 6mm; padding: 2.4mm 0; border-bottom: 1px solid currentColor; font-size: 10pt; }
.print-toc li b { font-weight: 400; }
.print-page .composition-frame:first-child { display: block !important; }
.print-page .print-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border: 1px dashed currentColor;
  color: inherit;
  font-size: 1.5cqw;
  opacity: .55;
}
</style>
</head>
<body class="print-doc print-doc--${mode}">
${pagesHtml}
</body>
</html>`;
}
