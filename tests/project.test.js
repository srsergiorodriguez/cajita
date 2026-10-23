import { describe, expect, it } from 'vitest';
import {
  createProject,
  createStage,
  projectStats,
  LIMITS
} from '../src/lib/domain/model.js';
import {
  migrateProject,
  parseProject,
  validateProject
} from '../src/lib/domain/project.js';

function makeIdFactory() {
  let n = 0;
  return () => `test-${++n}`;
}

function projectFixture(overrides = {}) {
  const project = createProject({
    title: 'Casa sin prisa',
    idFactory: makeIdFactory(),
    clock: () => new Date('2026-10-22T00:00:00.000Z')
  });
  return { ...project, ...overrides };
}

describe('project model', () => {
  it('creates a valid project with one start page', () => {
    const project = projectFixture();
    expect(project.format).toBe('cajita');
    expect(project.version).toBe(1);
    expect(project.pages).toHaveLength(1);
    expect(project.startPageId).toBe(project.pages[0].id);
    expect(project.stage.width).toBe(1200);
    expect(project.theme.name).toBe('papel');
    expect(project.grids).toEqual({});
    expect(project.gridSettings).toEqual({ show: true, snap: true });
    expect(project.pageTemplates).toEqual({});
    expect(project.pages[0].gridId).toBe('');
    expect(validateProject(project).ok).toBe(true);
  });

  it('normalizes legacy themes to the single Papel theme', () => {
    const project = projectFixture({
      theme: {
        name: 'riso',
        background: '#fff6ec',
        ink: '#1b1b1b',
        accent: '#e94f37',
        muted: '#7a6d62',
        pairing: 'poster',
        texture: 'halftone'
      }
    });
    const migrated = migrateProject(project);
    expect(migrated.ok).toBe(true);
    expect(migrated.project.theme.name).toBe('papel');
  });

  it('creates a stage from a preset', () => {
    const stage = createStage('square');
    expect(stage.width).toBe(1080);
    expect(stage.height).toBe(1080);
    expect(stage.fit).toBe('width');
  });

  it('accepts a page grid reference and rejects a missing one', () => {
    const project = projectFixture();
    project.grids.g_1 = { cellSize: 80, marginPercent: 5, merges: [] };
    project.pages[0].gridId = 'g_1';
    expect(validateProject(project).ok).toBe(true);
    project.pages[0].gridId = 'missing';
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.path === 'pages[0].gridId')).toBe(true);
  });

  it('rejects a missing start page', () => {
    const project = projectFixture({ startPageId: 'missing' });
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.path === 'startPageId')).toBe(true);
  });

  it('rejects duplicate page slugs and ids', () => {
    const project = projectFixture();
    project.pages.push({ ...project.pages[0] });
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.message === 'duplicate page id')).toBe(
      true
    );
    expect(result.errors.some((error) => error.message === 'duplicate slug')).toBe(true);
  });

  it('rejects reserved page slugs', () => {
    const project = projectFixture();
    project.pages[0].slug = 'assets';
    expect(validateProject(project).ok).toBe(false);
  });

  it('rejects an unsupported future version', () => {
    const project = projectFixture({ version: 99 });
    const migrated = migrateProject(project);
    expect(migrated.ok).toBe(false);
    expect(migrated.errors[0].path).toBe('version');
  });

  it('parses and validates a good project', () => {
    const parsed = parseProject(projectFixture());
    expect(parsed.ok).toBe(true);
    expect(parsed.project.title).toBe('Casa sin prisa');
  });

  it('counts pages, media, and bytes', () => {
    const project = projectFixture();
    project.assets = {
      a_1: { id: 'a_1', kind: 'image', bytes: 100 },
      a_2: { id: 'a_2', kind: 'video', bytes: 250 }
    };
    expect(projectStats(project)).toMatchObject({
      pages: 1,
      assets: 2,
      media: 2,
      fonts: 0,
      bytes: 350,
      byKind: { image: 1, video: 1, audio: 0, font: 0 }
    });
    expect(LIMITS.videos).toBe(3);
  });
});
