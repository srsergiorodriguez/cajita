import { buildPrintPages, formatPageNumber, normalisePrint, printContentSize } from '../domain/print.js';

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
    ? `<div class="print-toc"><h1>${escapeHtml(toc.title)}</h1><ol>${contentPages
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
      return `${vertical}:5mm;left:50%;transform:translateX(-50%)`;
    }
    const horizontalSide =
      horizontal === 'inner'
        ? side === 'right' ? 'left' : 'right'
        : horizontal === 'outer'
          ? side
          : horizontal;
    return `${vertical}:5mm;${horizontalSide}:8mm`;
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
  const pagesHtml = printPages
    .map((entry, index) => {
      const fragment = entry.kind === 'toc' ? tocFragment : fragments[contentIndex++];
      if (!fragment) return '';
      const page = entry?.page;
      const background =
        page?.background?.color ??
        project.stage?.background?.color ??
        project.siteBackground ??
        '#ffffff';
      const innerLeft = index % 2 === 0;
      const left = innerLeft ? print.margins.inner : print.margins.outer;
      const right = innerLeft ? print.margins.outer : print.margins.inner;
      return `<section class="print-sheet" data-page="${index + 1}" data-number="${entry?.number ?? ''}" style="width:${paperWidth}mm;height:${paperHeight}mm;padding:${print.margins.top}mm ${right}mm ${print.margins.bottom}mm ${left}mm"><div class="print-page" style="background:${background}">${fragment}</div>${entry.kind === 'page' ? runningHeadFor(entry, index) : ''}${folioFor(entry, index)}</section>`;
    })
    .filter(Boolean)
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
.print-toc { width: 100%; height: 100%; padding: 0; font-family: 'Space Mono', monospace; color: #1c1917; }
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
<body class="print-doc">
${pagesHtml}
</body>
</html>`;
}
