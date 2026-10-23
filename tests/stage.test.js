import { describe, expect, it } from 'vitest';
import { createProject } from '../src/lib/domain/model.js';
import { createElement } from '../src/lib/domain/elements.js';
import { resizeStage } from '../src/lib/domain/stage.js';

function fixture() {
  const project = createProject({ title: 'Página', stagePreset: 'wide' });
  const page = project.pages[0];
  project.assets.a_1 = {
    id: 'a_1',
    hash: 'abcdef1234567890',
    kind: 'image',
    name: 'image.png',
    mime: 'image/png',
    bytes: 10,
    width: 400,
    height: 300
  };
  const text = createElement('text', { project, page, text: 'Hola' });
  text.frame = { x: 120, y: 80, w: 600, h: 200, rotation: 0 };
  text.fontSize = 80;
  text.letterSpacing = 4;
  text.padding = 10;
  const image = createElement('image', { project, page, asset: project.assets.a_1 });
  image.frame = { x: 600, y: 400, w: 400, h: 300, rotation: 0 };
  page.elements.push(text, image);
  return { project, page, text, image };
}

describe('stage resize', () => {
  it('changes only the stage frame and leaves elements in place', () => {
    const { project, text, image } = fixture();
    resizeStage(project, 600, 800);
    expect(project.stage.width).toBe(600);
    expect(project.stage.height).toBe(800);
    expect(text.frame).toMatchObject({ x: 120, y: 80, w: 600, h: 200 });
    expect(text.fontSize).toBe(80);
    expect(text.letterSpacing).toBe(4);
    expect(text.padding).toBe(10);
    expect(image.frame).toMatchObject({ x: 600, y: 400, w: 400, h: 300 });
  });

  it('treats the same size as a no-op', () => {
    const { project } = fixture();
    const before = JSON.stringify(project.stage);
    expect(resizeStage(project, 1200, 800)).toBe(project);
    expect(JSON.stringify(project.stage)).toBe(before);
  });

  it('rejects sizes outside the safe range', () => {
    const { project } = fixture();
    expect(() => resizeStage(project, 100, 800)).toThrow();
    expect(() => resizeStage(project, 1200, 5000)).toThrow();
  });
});
