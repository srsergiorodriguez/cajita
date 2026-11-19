import { describe, expect, it } from 'vitest';
import { createProject, createStage } from '../src/lib/domain/model.js';


describe('responsive stage limits', () => {
  it('defaults maxWidth to the design width for new projects', () => {
    const project = createProject({ idFactory: () => 'stage-test' });
    expect(project.stage.maxWidth).toBe(project.stage.width);
    expect(project.stage.minWidth).toBe(360);
    expect(createStage('wide', { width: 800 }).maxWidth).toBe(800);
  });
});
