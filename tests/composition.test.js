import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { parseProject } from '../src/lib/domain/project.js';
import { createElement } from '../src/lib/domain/elements.js';
import {
  createComposition,
  createFrame,
  MAX_COMPOSITION_FRAMES,
  MAX_BUTTON_FRAMES,
  createCompositionChild,
  normaliseComposition
} from '../src/lib/domain/composition.js';
import { buildSite } from '../src/lib/export/site.js';

function fixture() {
  const project = createProject({ title: 'Composiciones', locale: 'es' });
  const button = createComposition('button');
  const idle = button.frames[0];
  idle.children = [
    createCompositionChild('shape', {
      frame: { x: 0, y: 0, w: 100, h: 100 },
      shape: 'square',
      fill: '#a82a1e',
      stroke: '#000000',
      radius: 12
    }),
    createCompositionChild('text', {
      text: 'Entrar',
      frame: { x: 10, y: 20, w: 80, h: 60 },
      color: '#fffdf7'
    })
  ];
  const element = createElement('composition', {
    project,
    page: project.pages[0],
    composition: button,
    compositionPreset: 'button'
  });
  project.pages[0].elements.push(element);
  return { project, element };
}

describe('composition element', () => {
  it('defaults buttons to 300 × 100', () => {
    const project = createProject({ title: 'Botón' });
    const element = createElement('composition', { project, page: project.pages[0] });
    expect(element.type).toBe('composition');
    expect(element.frame.w).toBe(300);
    expect(element.frame.h).toBe(100);
  });

  it('normalises legacy button states into frames', () => {
    const composition = normaliseComposition({
      states: {
        idle: [createCompositionChild('text', { text: 'Hola' })],
        hover: [],
        pressed: []
      },
      preset: 'button'
    });
    expect(composition.frames).toHaveLength(3);
    expect(composition.interactions.hover).toBe(composition.frames[1].id);
    expect(composition.preset).toBe('button');
  });

  it('migrates saved button elements to compositions', () => {
    const project = createProject({ title: 'Legacy' });
    project.pages[0].elements = [{
      id: 'el_legacy',
      type: 'button',
      frame: { x: 0, y: 0, w: 300, h: 100, rotation: 0 },
      z: 1,
      opacity: 1,
      locked: false,
      hidden: false,
      link: null,
      label: 'Botón',
      button: { states: { idle: [], hover: [], pressed: [] } }
    }];
    const parsed = parseProject(structuredClone(project));
    expect(parsed.ok).toBe(true);
    expect(parsed.project.pages[0].elements[0].type).toBe('composition');
    expect(parsed.project.pages[0].elements[0].composition.frames).toHaveLength(3);
  });

  it('limits buttons to three automatic states', () => {
    const button = normaliseComposition({
      preset: 'button',
      frames: Array.from({ length: 5 }, (_, index) => createFrame(`estado ${index + 1}`)),
      interactions: {},
      timeline: {}
    });
    expect(button.frames).toHaveLength(MAX_BUTTON_FRAMES);
    expect(button.interactions.hover).toBe(button.frames[1].id);
    expect(button.interactions.pressed).toBe(button.frames[2].id);
  });

  it('limits animation frames and uses F numbering', () => {
    const animation = createComposition('animation');
    expect(animation.frames.map((frame) => frame.name)).toEqual(['F1', 'F2']);
    const capped = normaliseComposition({
      ...animation,
      frames: Array.from({ length: 10 }, (_, index) => createFrame(`F${index + 1}`))
    });
    expect(capped.frames).toHaveLength(MAX_COMPOSITION_FRAMES);
    const renamed = normaliseComposition({
      preset: 'animation',
      frames: [createFrame('Fotograma 3')],
      interactions: {},
      timeline: { autoplay: false, loop: true, sequence: [] }
    });
    expect(renamed.frames[0].name).toBe('F3');
    const deduped = normaliseComposition({
      preset: 'animation',
      frames: [createFrame('F1'), createFrame('F2'), createFrame('F2')],
      interactions: {},
      timeline: { autoplay: false, loop: true, sequence: [] }
    });
    expect(deduped.frames.map((frame) => frame.name)).toEqual(['F1', 'F2', 'F3']);
  });

  it('exports button frames and state layers', () => {
    const { project } = fixture();
    const site = buildSite(project);
    const html = site.pages[0].html;
    expect(html).toContain('class="el el-composition"');
    expect(html).toContain('composition--button');
    expect(html).toContain('composition-frame');
    expect(html).toContain('is-hover');
    expect(html).toContain('Entrar');
    expect(site.css).toContain('container-type:size');
    expect(html).toMatch(/viewBox="0 0 [0-9.]+ 100"/);
  });

  it('exports animation frames in frame order', () => {
    const project = createProject({ title: 'Animación', locale: 'es' });
    const composition = createComposition('animation');
    composition.frames[0].children = [
      createCompositionChild('text', { text: 'Uno' })
    ];
    composition.frames[1].children = [
      createCompositionChild('text', { text: 'Dos' })
    ];
    const element = createElement('composition', {
      project,
      page: project.pages[0],
      composition,
      compositionPreset: 'animation'
    });
    project.pages[0].elements.push(element);
    const html = buildSite(project).pages[0].html;
    expect(html).toContain('composition--animation');
    expect(html).toContain('data-composition-animation');
    expect(html).toContain('data-duration');
    expect(html.indexOf('Uno')).toBeLessThan(html.indexOf('Dos'));
  });
});
