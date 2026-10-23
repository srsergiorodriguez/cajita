import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import {
  createElement,
  duplicateElement,
  fontStack,
  imageFrame,
  mediaFrame
} from '../src/lib/domain/elements.js';
import { validateProject } from '../src/lib/domain/project.js';

function project() {
  return createProject({ title: 'Elementos' });
}

describe('element factory', () => {
  it('creates a valid text element', () => {
    const p = project();
    const el = createElement('text', {
      project: p,
      page: p.pages[0],
      text: 'Una casa sin prisa'
    });
    expect(el.type).toBe('text');
    expect(el.z).toBe(1);
    expect(el.frame.rotation).toBe(0);
    p.pages[0].elements.push(el);
    expect(validateProject(p).ok).toBe(true);
  });

  it('creates a valid image element when the asset exists', () => {
    const p = project();
    p.assets.a_1 = {
      id: 'a_1',
      hash: 'h',
      kind: 'image',
      name: 'foto.jpg',
      mime: 'image/jpeg',
      bytes: 10
    };
    const asset = p.assets.a_1;
    const el = createElement('image', {
      project: p,
      page: p.pages[0],
      asset,
      frame: imageFrame(asset, p.stage)
    });
    p.pages[0].elements.push(el);
    expect(el.assetId).toBe('a_1');
    expect(validateProject(p).ok).toBe(true);
  });

  it('gives video an aspect fit and audio a compact frame', () => {
    const p = project();
    const video = mediaFrame({ kind: 'video', width: 1600, height: 900 }, p.stage);
    expect(video.w / video.h).toBeCloseTo(16 / 9);
    const audio = mediaFrame({ kind: 'audio' }, p.stage);
    expect(audio.h).toBe(76);
    const videoEl = createElement('video', { project: p, page: p.pages[0] });
    expect(videoEl.controls).toBe(true);
    expect(videoEl.muted).toBe(true);
  });

  it('creates a validated Observable embed', () => {
    const p = project();
    const el = createElement('embed', {
      project: p,
      page: p.pages[0],
      provider: 'observable',
      url: 'https://observablehq.com/@d3/bar-chart',
      title: 'Bar chart'
    });
    p.pages[0].elements.push(el);
    expect(el.type).toBe('embed');
    expect(el.title).toBe('Bar chart');
    expect(validateProject(p).ok).toBe(true);
  });

  it('creates a valid shape from the theme', () => {
    const p = project();
    const el = createElement('shape', {
      project: p,
      page: p.pages[0],
      shape: 'triangle'
    });
    p.pages[0].elements.push(el);
    expect(el.type).toBe('shape');
    expect(el.shape).toBe('triangle');
    expect(el.fill).toBe(p.theme.accent);
    expect(validateProject(p).ok).toBe(true);
  });

  it('duplicates with a new id and an offset', () => {
    const p = project();
    const el = createElement('text', { project: p, page: p.pages[0], text: 'Hola' });
    const copy = duplicateElement(el);
    expect(copy.id).not.toBe(el.id);
    expect(copy.frame.x).toBe(el.frame.x + 24);
  });

  it('resolves built-in and custom font stacks', () => {
    const p = project();
    expect(fontStack(p, 'fraunces')).toContain('Fraunces');
    p.fonts.f_1 = { id: 'f_1', name: 'Mi tipo' };
    expect(fontStack(p, 'f_1')).toContain('cajita-font-f_1');
  });
});
