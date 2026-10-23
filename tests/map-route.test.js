import { describe, expect, it } from 'vitest';
import { routeEdge } from '../src/lib/domain/map-route.js';

const layout = {
  cardW: 232,
  cardH: 126,
  gapX: 58,
  gapY: 64,
  columns: 3,
  pad: 38
};

function position(index) {
  return {
    x: layout.pad + (index % layout.columns) * (layout.cardW + layout.gapX),
    y: layout.pad + Math.floor(index / layout.columns) * (layout.cardH + layout.gapY)
  };
}

function inside(point, rect) {
  return (
    point.x > rect.x &&
    point.x < rect.x + layout.cardW &&
    point.y > rect.y &&
    point.y < rect.y + layout.cardH
  );
}

describe('map edge routing', () => {
  it('routes a same-column long edge through a side gutter and row gap', () => {
    const from = position(0);
    const to = position(15);
    const route = routeEdge({ ...layout, from, to, fromColumn: 0 });
    expect(route.gutterX).toBeLessThan(from.x);
    expect(route.laneY).toBeLessThan(to.y);
    expect(inside({ x: route.gutterX, y: (from.y + to.y) / 2 }, from)).toBe(false);
    expect(inside({ x: route.targetX, y: route.laneY }, to)).toBe(false);
  });

  it('does not put any bend inside an intervening card', () => {
    for (let a = 0; a < 16; a++) {
      for (let b = 0; b < 16; b++) {
        if (a === b) continue;
        const from = position(a);
        const to = position(b);
        const route = routeEdge({
          ...layout,
          from,
          to,
          fromColumn: a % layout.columns,
          index: a + b
        });
        for (let card = 0; card < 16; card++) {
          const rect = position(card);
          if (card === a || card === b) continue;
          expect(inside({ x: route.gutterX, y: route.laneY }, rect)).toBe(false);
          expect(inside({ x: route.targetX, y: route.laneY }, rect)).toBe(false);
        }
      }
    }
  });
});
