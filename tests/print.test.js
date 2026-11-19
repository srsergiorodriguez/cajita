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
