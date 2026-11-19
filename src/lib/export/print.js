import { normalisePrint, printContentSize } from '../domain/print.js';

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
  const pagesHtml = fragments
    .map((fragment, index) => {
      const page = project.pages?.[index];
      const background =
        page?.background?.color ??
        project.stage?.background?.color ??
        project.siteBackground ??
        '#ffffff';
      const innerLeft = index % 2 === 0;
      const left = innerLeft ? print.margins.inner : print.margins.outer;
      const right = innerLeft ? print.margins.outer : print.margins.inner;
      return `<section class="print-sheet" data-page="${index + 1}" style="width:${paperWidth}mm;height:${paperHeight}mm;padding:${print.margins.top}mm ${right}mm ${print.margins.bottom}mm ${left}mm"><div class="print-page" style="background:${background}">${fragment}</div></section>`;
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
