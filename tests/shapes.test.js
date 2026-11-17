import { describe, expect, it } from 'vitest';
import { shapeMarkup, shapeSvg } from '../src/lib/domain/shapes.js';

describe('shapes', () => {
  it('rounds rectangle corners', () => {
    const markup = shapeMarkup({
      shape: 'square',
      fill: '#a82a1e',
      stroke: '#1c1917',
      strokeWidth: 0,
      radius: 24
    });
    expect(markup).toContain('rx="24"');
    expect(markup).toContain('ry="24"');
  });

  it('rounds triangle corners with quadratic segments', () => {
    const sharp = shapeMarkup({
      shape: 'triangle',
      fill: '#a82a1e',
      stroke: '#1c1917',
      strokeWidth: 0,
      radius: 0
    });
    const rounded = shapeMarkup({
      shape: 'triangle',
      fill: '#a82a1e',
      stroke: '#1c1917',
      strokeWidth: 0,
      radius: 20
    });
    expect(sharp).not.toBe(rounded);
    expect(rounded).toContain('<path');
    expect(rounded).toContain(' Q ');
    expect(shapeSvg({ shape: 'triangle', fill: '#000', stroke: '#000', radius: 20 })).toContain(
      '<path'
    );
  });

  it('leaves circles unchanged when a radius is supplied', () => {
    const markup = shapeMarkup({
      shape: 'circle',
      fill: '#a82a1e',
      stroke: '#1c1917',
      strokeWidth: 0,
      radius: 20
    });
    expect(markup).toContain('<circle');
    expect(markup).not.toContain('rx=');
  });
});
