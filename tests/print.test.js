import { describe, expect, it } from 'vitest';
import { createPrintStage, normalisePrint, printContentSize } from '../src/lib/domain/print.js';
import { createProject } from '../src/lib/domain/model.js';

describe('print geometry', () => {
  it('computes the printable area from paper and margins', () => {
    const content = printContentSize({
      paper: { preset: 'a5' },
      orientation: 'portrait',
      margins: { top: 12, bottom: 12, inner: 16, outer: 10 }
    });
    expect(content.width).toBeCloseTo(122);
    expect(content.height).toBeCloseTo(186);
    expect(content.ratio).toBeCloseTo(122 / 186);
  });

  it('swaps the page dimensions for landscape', () => {
    const landscape = printContentSize({ paper: { preset: 'a5' }, orientation: 'landscape' });
    expect(landscape.width).toBeCloseTo(210 - 16 - 10);
    expect(landscape.height).toBeCloseTo(148 - 12 - 12);
  });

  it('creates a crossmedia project with a print-derived stage', () => {
    const project = createProject({
      title: 'Zine',
      print: {
        paper: { preset: 'a5' },
        orientation: 'portrait',
        margins: { top: 12, bottom: 12, inner: 16, outer: 10 }
      }
    });
    expect(project.print.paper.preset).toBe('a5');
    expect(project.stage.width / project.stage.height).toBeCloseTo(122 / 186, 3);
    expect(project.stage.maxWidth).toBe(project.stage.width);
    expect(createPrintStage(project.print).height).toBe(project.stage.height);
  });

  it('rejects margins that leave no content area', () => {
    expect(() =>
      normalisePrint({
        paper: { preset: 'a5' },
        margins: { top: 150, bottom: 100, inner: 20, outer: 20 }
      })
    ).not.toThrow();
    expect(() =>
      printContentSize({
        paper: { preset: 'a5' },
        margins: { top: 150, bottom: 100, inner: 20, outer: 20 }
      })
    ).toThrow();
  });
});

describe('print page sequence', () => {
  it('assigns printed page numbers from the numbering start', async () => {
    const { buildPrintPages, formatPageNumber } = await import('../src/lib/domain/print.js');
    const project = createProject({
      title: 'Zine',
      print: {
        paper: { preset: 'a5' },
        numbering: { start: 3, format: '01', hideOnFirst: true }
      }
    });
    const pages = buildPrintPages(project);
    expect(pages).toHaveLength(1);
    expect(pages[0].number).toBe(3);
    expect(pages[0].visibleNumber).toBe(false);
    expect(formatPageNumber(3, 8, '01')).toBe('03');
    expect(formatPageNumber(3, 8, '1 / N')).toBe('3 / 8');
  });
});

describe('print running heads', () => {
  it('normalises running-head settings', async () => {
    const { normalisePrint } = await import('../src/lib/domain/print.js');
    const print = normalisePrint({ runningHead: { enabled: true, content: 'page-title' } });
    expect(print.runningHead.enabled).toBe(true);
    expect(print.runningHead.content).toBe('page-title');
    expect(normalisePrint({}).runningHead.enabled).toBe(false);
  });
});

describe('print table of contents', () => {
  it('inserts an unnumbered TOC before numbered content pages', async () => {
    const { buildPrintPages } = await import('../src/lib/domain/print.js');
    const project = createProject({
      title: 'Zine',
      print: {
        paper: { preset: 'a5' },
        toc: { enabled: true, title: 'Contenido' },
        numbering: { start: 5, hideOnFirst: false }
      }
    });
    project.pages.push({ ...project.pages[0], id: 'p2', title: 'Segunda' });
    const pages = buildPrintPages(project);
    expect(pages[0].kind).toBe('toc');
    expect(pages[1].number).toBe(5);
    expect(pages[2].number).toBe(6);
  });
});
