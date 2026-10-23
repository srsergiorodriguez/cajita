import { describe, expect, it } from 'vitest';
import {
  pruneRedirects,
  pushRedirect,
  redirectsForRename
} from '../src/lib/domain/redirects.js';

const pages = [
  { id: 'p1', slug: 'inicio' },
  { id: 'p2', slug: 'sobre' },
  { id: 'p3', slug: 'contacto' }
];

const clock = () => '2026-10-22T00:00:00.000Z';

describe('redirects queue', () => {
  it('keeps the newest five entries and drops the oldest', () => {
    let queue = [];
    for (let i = 0; i < 7; i += 1) {
      queue = pushRedirect(queue, { from: `viejo-${i}`, toPageId: 'p2' }, pages, clock);
    }
    expect(queue).toHaveLength(5);
    expect(queue.map((item) => item.from)).toEqual([
      'viejo-2',
      'viejo-3',
      'viejo-4',
      'viejo-5',
      'viejo-6'
    ]);
  });

  it('drops a redirect when a live page owns the slug', () => {
    const queue = pushRedirect(
      [{ from: 'sobre', toPageId: 'p3', createdAt: clock() }],
      { from: 'contacto', toPageId: 'p2' },
      pages,
      clock
    );
    expect(queue.some((item) => item.from === 'sobre')).toBe(false);
  });

  it('drops redirects whose target page was deleted', () => {
    const queue = pruneRedirects(
      [{ from: 'viejo', toPageId: 'p3', createdAt: clock() }],
      [{ id: 'p1', slug: 'inicio' }]
    );
    expect(queue).toEqual([]);
  });

  it('replaces a duplicate source instead of adding twice', () => {
    const queue = pushRedirect(
      [{ from: 'viejo', toPageId: 'p3', createdAt: clock() }],
      { from: 'viejo', toPageId: 'p2' },
      pages,
      clock
    );
    expect(queue).toHaveLength(1);
    expect(queue[0].toPageId).toBe('p2');
  });

  it('turns a rename into a redirect for the old slug', () => {
    const queue = redirectsForRename([], pages, 'p2', 'retrato', clock);
    expect(queue).toEqual([
      {
        from: 'sobre',
        toPageId: 'p2',
        createdAt: '2026-10-22T00:00:00.000Z'
      }
    ]);
  });
});
