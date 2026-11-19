import { describe, expect, it } from 'vitest';
import { buildPrintDocument } from '../src/lib/export/print.js';

const project = {
  title: 'Zine',
  locale: 'es',
  pages: [{ id: 'p1', title: 'Inicio', background: { color: '#ffffff' } }],
  print: {
    paper: { preset: 'a5', width: 148, height: 210, unit: 'mm' },
    orientation: 'portrait',
    margins: { top: 12, bottom: 12, inner: 16, outer: 10, unit: 'mm' },
    runningHead: { enabled: true, content: 'page-title', hideOnFirst: false }
  }
};

describe('print export', () => {
  it('builds one page per page fragment with physical page CSS', () => {
    const html = buildPrintDocument(project, [
      { html: '<html><head><style>.stage{width:100vw}</style></head><body><main class="stage"><p>Uno</p></main></body></html>' },
      { html: '<html><head><style>.stage{width:100vw}</style></head><body><main class="stage"><p>Dos</p></main></body></html>' }
    ]);
    expect(html).toContain('@page');
    expect(html).toContain('size: 148mm 210mm');
    expect(html).toContain('margin: 0;');
    expect(html).toContain('width: 122mm');
    expect(html).toContain('height: 186mm');
    expect(html).toContain('class="print-sheet"');
    expect(html).toContain('background:#ffffff');
    expect(html).toContain('data-page="1"');
    expect(html).toContain('data-page="2"');
    expect(html).toContain('Uno');
    expect(html).toContain('print-running-head');
    expect(html).toContain('Inicio');
    expect(html).toContain('Dos');
  });
});
