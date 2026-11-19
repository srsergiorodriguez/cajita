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
    .map(
      (fragment, index) =>
        `<section class="print-page" data-page="${index + 1}">${fragment}</section>`
    )
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
  margin: ${print.margins.top}mm ${print.margins.outer}mm ${print.margins.bottom}mm ${print.margins.inner}mm;
}
@page :left {
  margin-left: ${print.margins.outer}mm;
  margin-right: ${print.margins.inner}mm;
}
@page :right {
  margin-left: ${print.margins.inner}mm;
  margin-right: ${print.margins.outer}mm;
}
html, body { margin: 0; padding: 0; background: #fff; }
body { display: block; min-height: 0; }
.print-page {
  width: 100%;
  height: calc(${content.height}mm * 1);
  overflow: hidden;
  break-inside: avoid;
  break-after: page;
  page-break-after: always;
}
.print-page:last-child { break-after: auto; page-break-after: auto; }
.print-page .stage {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  aspect-ratio: auto !important;
  margin: 0 !important;
  box-shadow: none !important;
}
</style>
</head>
<body class="print-doc">
${pagesHtml}
</body>
</html>`;
}
