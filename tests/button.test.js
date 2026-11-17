import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { createElement } from '../src/lib/domain/elements.js';
import {
  buttonState,
  createButtonChild,
  normaliseButton
} from '../src/lib/domain/button.js';
import { buildSite } from '../src/lib/export/site.js';

function fixture() {
  const project = createProject({ title: 'Botones', locale: 'es' });
  const button = {
    states: {
      idle: [
        createButtonChild('shape', {
          frame: { x: 0, y: 0, w: 100, h: 100 },
          shape: 'square',
          fill: '#a82a1e',
          stroke: '#000000',
          radius: 12
        }),
        createButtonChild('text', {
          text: 'Entrar',
          frame: { x: 10, y: 20, w: 80, h: 60 },
          color: '#fffdf7'
        })
      ],
      hover: [],
      pressed: []
    }
  };
  const element = createElement('button', { project, page: project.pages[0], button });
  project.pages[0].elements.push(element);
  return { project, element };
}

describe('button element', () => {
  it('falls back from hover and pressed to idle', () => {
    const button = normaliseButton({
      states: {
        idle: [createButtonChild('text', { text: 'Hola' })],
        hover: [],
        pressed: []
      }
    });
    expect(buttonState(button, 'hover')).toHaveLength(1);
    expect(buttonState(button, 'pressed')).toHaveLength(1);
  });

  it('exports state layers and child primitives', () => {
    const { project } = fixture();
    const site = buildSite(project);
    const html = site.pages[0].html;
    expect(html).toContain('class="el el-button"');
    expect(html).toContain('button-state--idle');
    expect(html).toContain('button-state--hover');
    expect(html).toContain('button-state--pressed');
    expect(html).toContain('Entrar');
    expect(site.css).toContain('container-type:size');
  });
});
