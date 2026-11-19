import { buildPrintPages, formatPageNumber, normalisePrint, printContentSize } from '../domain/print.js';

function extractStyle(html = '') {
  return html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
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
  const total = printPages.length;
  const folioFor = (entry, index) => {
    if (!entry?.visibleNumber) return '';
    const value = formatPageNumber(entry.number, total, print.numbering.format);
    const [vertical, horizontal] = print.numbering.position.split('-');
    const side = index % 2 === 0 ? 'right' : 'left';
    const horizontalSide =
      horizontal === 'center' ? '' : horizontal === 'inner'
        ? side === 'right' ? 'left' : 'right'
        : horizontal === 'outer'
          ? side
          : horizontal;
    const position =
      horizontal === 'center'
        ? `${vertical}:5mm;left:50%;transform:translateX(-50%)`
        : `${vertical}:5mm;${horizontalSide}:${horizontal === 'center' ? 0 : 8}mm`;
    return `<span class="print-folio" style="${position}">${value}</span>`;
  };
  const pagesHtml = fragments
    .map((fragment, index) => {
      const entry = printPages[index];
      const page = entry?.page;
      const background =
        page?.background?.color ??
        project.stage?.background?.color ??
        project.siteBackground ??
        '#ffffff';
      const innerLeft = index % 2 === 0;
      const left = innerLeft ? print.margins.inner : print.margins.outer;
      const right = innerLeft ? print.margins.outer : print.margins.inner;
      return `<section class="print-sheet" data-page="${index + 1}" data-number="${entry?.number ?? ''}" style="width:${paperWidth}mm;height:${paperHeight}mm;padding:${print.margins.top}mm ${right}mm ${print.margins.bottom}mm ${left}mm"><div class="print-page" style="background:${background}">${fragment}</div>${folioFor(entry, index)}</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="${project.locale ?? 'es'}">
<head>
<meta charset="utf-8" />
<title>${project.title ?? 'cajita'}</title>
<style>${style}</style>
<style>
@page {
  size: ${paperWidth}mm ${paperHeight}mm;
  margin: 0;
}
html, body { margin: 0; padding: 0; }
body { display: block; min-height: 0; }
.print-sheet {
  box-sizing: border-box;
  width: ${paperWidth}mm;
  height: ${paperHeight}mm;
  margin: 0 auto;
  background: #fff;
  position: relative;
  overflow: hidden;
  break-inside: avoid;
  break-after: page;
  page-break-after: always;
}
.print-sheet:last-child { break-after: auto; page-break-after: auto; }
.print-page {
  width: ${content.width}mm;
  height: ${content.height}mm;
  overflow: hidden;
}
@media screen {
  body { background: #24282e; }
  .print-sheet {
    margin: 24px auto;
    box-shadow: 0 0 0 1px #111, 0 18px 42px rgba(0, 0, 0, .35);
  }
}
@media print {
  .print-sheet { margin: 0; box-shadow: none; }
}
.print-page .stage {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  aspect-ratio: auto !important;
  margin: 0 !important;
  box-shadow: none !important;
}
.print-folio {
  position: absolute;
  z-index: 2;
  font-family: 'Space Mono', monospace;
  font-size: 8pt;
  line-height: 1;
  color: #1c1917;
}
.print-page .composition-frame { display: none !important; }
.print-folio {
  position: absolute;
  z-index: 2;
  font-family: 'Space Mono', monospace;
  font-size: 8pt;
  line-height: 1;
  color: #1c1917;
}
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
<body class="print-doc">
${pagesHtml}
</body>
</html>`;
}
