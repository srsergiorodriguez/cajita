import { describe, expect, it } from 'vitest';
import {
  frameToCss,
  pxToCqw,
  normaliseAngle,
  resizeFrame,
  rotateFrame,
  snapMove,
  pointToLocal,
  frameContainsPoint
} from '../src/lib/domain/geometry.js';

const stage = { width: 1200, height: 800 };
const frame = { x: 100, y: 100, w: 300, h: 200, rotation: 0 };

describe('frame CSS', () => {
  it('turns design pixels into stage percentages', () => {
    expect(frameToCss(frame, stage)).toEqual({
      '--x': '8.3333%',
      '--y': '12.5000%',
      '--w': '25.0000%',
      '--h': '25.0000%',
      '--rot': '0.00deg'
    });
  });

  it('turns font sizes into cqw units', () => {
    expect(pxToCqw(60, 1200)).toBe('5.0000cqw');
    expect(pxToCqw(30, 1200)).toBe('2.5000cqw');
  });

  it('normalises angles into (-180, 180]', () => {
    expect(normaliseAngle(540)).toBe(180);
    expect(normaliseAngle(-180)).toBe(180);
    expect(normaliseAngle(-190)).toBe(170);
    expect(normaliseAngle(0)).toBe(0);
  });
});

describe('resizeFrame', () => {
  it('resizes from the south-east handle', () => {
    const next = resizeFrame(frame, 'se', { x: 500, y: 400 });
    expect(next).toMatchObject({ x: 100, y: 100, w: 400, h: 300 });
  });

  it('resizes from the north-west handle', () => {
    const next = resizeFrame(frame, 'nw', { x: 50, y: 50 });
    expect(next).toMatchObject({ x: 50, y: 50, w: 350, h: 250 });
  });

  it('honours the minimum size', () => {
    const next = resizeFrame(frame, 'se', { x: 101, y: 101 }, { minSize: 40 });
    expect(next.w).toBe(40);
    expect(next.h).toBe(40);
  });

  it('keeps the aspect ratio for corners', () => {
    const next = resizeFrame(frame, 'se', { x: 700, y: 500 }, { keepAspect: true });
    expect(next.w / next.h).toBeCloseTo(1.5, 3);
  });

  it('resizes from the centre', () => {
    const next = resizeFrame(frame, 'e', { x: 500, y: 200 }, { fromCenter: true });
    expect(next.x).toBe(0);
    expect(next.w).toBe(500);
  });
});

describe('rotateFrame', () => {
  it('rotates with the pointer and snaps to 15 degrees', () => {
    const next = rotateFrame(frame, { x: 250, y: 500 }, 15);
    expect(next.rotation).toBe(180);
    const right = rotateFrame(frame, { x: 800, y: 200 }, 15);
    expect(right.rotation).toBe(90);
  });
});

describe('local points and snapping', () => {
  it('converts a stage point into local space', () => {
    const rotated = { ...frame, rotation: 90 };
    const local = pointToLocal({ x: 250, y: 200 }, rotated);
    expect(local.x).toBeCloseTo(250, 4);
    expect(local.y).toBeCloseTo(200, 4);
    expect(frameContainsPoint(frame, { x: 150, y: 150 })).toBe(true);
    expect(frameContainsPoint(frame, { x: 500, y: 150 })).toBe(false);
  });

  it('snaps to another element edge and reports a guide', () => {
    const moving = { x: 97, y: 50, w: 100, h: 100, rotation: 0 };
    const other = { x: 100, y: 300, w: 100, h: 100, rotation: 0 };
    const result = snapMove(moving, stage, [other]);
    expect(result.frame.x).toBe(100);
    expect(result.guides.x).toBe(100);
  });

  it('can disable snapping', () => {
    const moving = { x: 97, y: 50, w: 100, h: 100, rotation: 0 };
    const result = snapMove(moving, stage, [], { enabled: false });
    expect(result.frame.x).toBe(97);
    expect(result.guides.x).toBe(null);
  });
});

describe('rotated resizing', () => {
  it('keeps the opposite corner pinned in stage space', async () => {
    const { resizeRotatedFrame, pointToStage, frameCenter } =
      await import('../src/lib/domain/geometry.js');
    const rotated = { x: 100, y: 100, w: 200, h: 100, rotation: 90 };
    const next = resizeRotatedFrame(rotated, 'se', { x: 400, y: 300 });
    const startAnchor = pointToStage({ x: rotated.x, y: rotated.y }, rotated);
    const endAnchor = pointToStage({ x: next.x, y: next.y }, next);
    expect(endAnchor.x).toBeCloseTo(startAnchor.x, 4);
    expect(endAnchor.y).toBeCloseTo(startAnchor.y, 4);
    expect(next.w).toBe(300);
    expect(next.h).toBe(200);
    expect(frameCenter(next)).toEqual({ x: 150, y: 200 });
  });
});
