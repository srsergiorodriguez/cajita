import { describe, expect, it } from 'vitest';
import {
  gridCells,
  gridGeometry,
  mergeGridCells,
  reflowGrid,
  snapFrameMove,
  snapFrameResize,
  unmergeGridCells
} from '../src/lib/domain/grid.js';

const stage = { width: 400, height: 400 };
const grid = { cellSize: 100, marginPercent: 0, merges: [] };

describe('layout grid', () => {
  it('derives cell geometry from size and margin', () => {
    const geometry = gridGeometry({ cellSize: 100, marginPercent: 5 }, stage);
    expect(geometry.cols).toBe(3);
    expect(geometry.rows).toBe(3);
    expect(geometry.x).toBe(50);
    expect(geometry.y).toBe(50);
    expect(geometry.xs).toEqual([50, 150, 250, 350]);
  });

  it('merges and unmerges rectangular cells', () => {
    const merged = mergeGridCells(grid, { x: 0, y: 0, w: 2, h: 2 }, stage);
    const cells = gridCells(merged, stage);
    expect(cells.merges).toEqual([{ x: 0, y: 0, w: 2, h: 2 }]);
    expect(cells.cells.find((cell) => cell.x === 0 && cell.y === 0)).toMatchObject({
      w: 2,
      h: 2
    });
    const unmerged = unmergeGridCells(merged, { x: 0, y: 0, w: 2, h: 2 }, stage);
    expect(unmerged.merges).toEqual([]);
  });

  it('centers the grid and reflows merges when the page shrinks', () => {
    const wide = { cellSize: 100, marginPercent: 0, merges: [{ x: 2, y: 2, w: 2, h: 2 }] };
    const clipped = reflowGrid(wide, { width: 350, height: 350 });
    expect(clipped.merges).toEqual([{ x: 2, y: 2, w: 1, h: 1 }]);
    const dropped = reflowGrid(wide, { width: 250, height: 250 });
    expect(dropped.merges).toEqual([]);
  });

  it('keeps merge cell coordinates when cell size changes', () => {
    const merged = mergeGridCells(grid, { x: 0, y: 0, w: 2, h: 2 }, stage);
    const resized = { ...merged, cellSize: 80 };
    expect(resized.merges).toEqual([{ x: 0, y: 0, w: 2, h: 2 }]);
  });

  it('snaps moving edges without moving the opposite side', () => {
    const frame = { x: 95, y: 0, w: 100, h: 50 };
    expect(snapFrameResize(frame, 'w', grid, stage, 8)).toMatchObject({
      x: 100,
      w: 95
    });
  });

  it('does not snap inside a merged cell', () => {
    const merged = mergeGridCells(grid, { x: 0, y: 0, w: 2, h: 2 }, stage);
    const frame = { x: 95, y: 50, w: 30, h: 30 };
    expect(snapFrameMove(frame, merged, stage, 8).x).toBe(95);
    expect(snapFrameMove(frame, grid, stage, 8).x).toBe(100);
  });
});
