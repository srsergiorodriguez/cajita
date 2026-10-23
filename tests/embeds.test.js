import { describe, expect, it } from 'vitest';
import {
  embedSrc,
  parseEmbed,
  parseObservable,
  parseYoutube
} from '../src/lib/domain/embeds.js';

describe('embed URLs', () => {
  it('parses YouTube watch, short, short-link, and start time', () => {
    expect(
      parseYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s')
    ).toMatchObject({
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90'
    });
    expect(parseYoutube('https://youtu.be/dQw4w9WgXcQ').embedUrl).toContain(
      '/embed/dQw4w9WgXcQ'
    );
    expect(parseYoutube('https://youtube.com/shorts/dQw4w9WgXcQ').embedUrl).toContain(
      '/embed/dQw4w9WgXcQ'
    );
  });

  it('rejects non-YouTube hosts and malformed IDs', () => {
    expect(parseYoutube('https://vimeo.com/123')).toBeNull();
    expect(parseYoutube('https://youtube.com/watch?v=bad')).toBeNull();
  });

  it('normalizes Observable notebook and embed URLs', () => {
    expect(parseObservable('https://observablehq.com/@d3/bar-chart?cells=chart')).toEqual(
      expect.objectContaining({
        provider: 'observable',
        embedUrl: 'https://observablehq.com/embed/@d3/bar-chart?cells=chart'
      })
    );
    expect(parseObservable('https://observablehq.com/embed/@d3/bar-chart').embedUrl).toBe(
      'https://observablehq.com/embed/@d3/bar-chart'
    );
    expect(parseObservable('https://example.com/@d3/bar-chart')).toBeNull();
  });

  it('parses a p5 editor sketch URL', () => {
    expect(
      parseEmbed(
        'p5',
        'https://editor.p5js.org/sl.rodriguez48/full/piEZn0e1j'
      )
    ).toMatchObject({
      provider: 'p5',
      embedUrl: 'https://editor.p5js.org/sl.rodriguez48/full/piEZn0e1j'
    });
    expect(parseEmbed('p5', 'https://example.com/full/abc')).toBeNull();
    expect(
      embedSrc({
        provider: 'p5',
        url: 'https://editor.p5js.org/sl.rodriguez48/full/piEZn0e1j'
      })
    ).toContain('/full/piEZn0e1j');
  });

  it('builds embed src from stored source URLs', () => {
    expect(
      embedSrc({ provider: 'observable', url: 'https://observablehq.com/@d3/bar-chart' })
    ).toBe('https://observablehq.com/embed/@d3/bar-chart');
    expect(
      embedSrc({
        provider: 'youtube',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      })
    ).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
});
