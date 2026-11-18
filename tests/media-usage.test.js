import { describe, expect, it } from 'vitest';
import { assetUsage, assetUsageMap, assetUseCount } from '../src/lib/domain/media-usage.js';

const project = {
  pages: [
    {
      title: 'Inicio',
      elements: [
        { assetId: 'image', composition: null },
        {
          assetId: '',
          composition: {
            frames: [
              { children: [{ assetId: 'composition-child' }, { assetId: 'nested-drawing' }] }
            ]
          }
        }
      ]
    }
  ],
  fichas: { f1: { assetId: 'ficha-image' } },
  drawings: { d1: { assetId: 'drawing-image' } },
  fonts: { font1: { assetId: 'font-file' } }
};

describe('media usage', () => {
  it('counts pages, composition children, fichas, drawings, and fonts', () => {
    const usage = assetUsageMap(project);
    expect(usage.get('image').elements).toBe(1);
    expect(usage.get('composition-child').compositions).toBe(1);
    expect(usage.get('nested-drawing').compositions).toBe(1);
    expect(usage.get('ficha-image').fichas).toBe(1);
    expect(usage.get('drawing-image').drawings).toBe(1);
    expect(usage.get('font-file').fonts).toBe(1);
    expect(assetUseCount(assetUsage(project, 'composition-child'))).toBe(1);
    expect(assetUsage(project, 'image').references).toEqual([{ kind: 'page', label: 'Inicio' }]);
  });

  it('reports zero for unused assets', () => {
    expect(assetUseCount(assetUsage(project, 'unused'))).toBe(0);
  });
});
