import { describe, expect, it } from 'vitest';
import {
  assetFileName,
  checkAssetLimit,
  findAssetByHash,
  kindForMime,
  safeFileName,
  sha256Hex,
  sniffMime,
  toBytes
} from '../src/lib/domain/assets.js';
import { LIMITS } from '../src/lib/domain/model.js';

function projectWithAssets(assets = {}) {
  return { assets };
}

describe('asset sniffing', () => {
  it('recognizes common signatures', () => {
    expect(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png');
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff]))).toBe('image/jpeg');
    expect(sniffMime(new TextEncoder().encode('GIF89a'))).toBe('image/gif');
    expect(sniffMime(new TextEncoder().encode('RIFF....WEBP'))).toBe('image/webp');
    expect(sniffMime(new TextEncoder().encode('wOF2....'))).toBe('font/woff2');
    expect(sniffMime(new TextEncoder().encode('OggS....'))).toBe('audio/ogg');
  });

  it('falls back to the declared MIME only for broad families', () => {
    expect(sniffMime(new Uint8Array([1, 2, 3]), 'image/webp')).toBe('image/webp');
    expect(sniffMime(new Uint8Array([1, 2, 3]), 'text/plain')).toBe('text/plain');
  });

  it('maps kinds', () => {
    expect(kindForMime('image/png')).toBe('image');
    expect(kindForMime('video/mp4')).toBe('video');
    expect(kindForMime('audio/mpeg')).toBe('audio');
    expect(kindForMime('font/woff2')).toBe('font');
    expect(kindForMime('application/pdf')).toBe(null);
  });
});

describe('asset names', () => {
  it('creates content-addressed names', () => {
    expect(
      assetFileName('abcdef1234567890', 'Retrato de la casa.JPG', 'image/webp')
    ).toBe('abcdef1234-retrato-de-la-casa.webp');
  });

  it('strips paths and control characters', () => {
    expect(safeFileName('../secreto.png')).toBe('secreto.png');
    expect(safeFileName('a\u0000b.png')).toBe('ab.png');
  });
});

describe('asset limits', () => {
  it('enforces the image cap', () => {
    const assets = {};
    for (let i = 0; i < LIMITS.images; i += 1) {
      assets[`a_${i}`] = { id: `a_${i}`, kind: 'image', bytes: 1, hash: `h${i}` };
    }
    expect(checkAssetLimit(projectWithAssets(assets), 'image', 1).ok).toBe(false);
  });

  it('enforces video count and total bytes', () => {
    const assets = {
      a_1: { id: 'a_1', kind: 'video', bytes: 40 * 1024 * 1024 },
      a_2: { id: 'a_2', kind: 'video', bytes: 40 * 1024 * 1024 }
    };
    expect(checkAssetLimit(projectWithAssets(assets), 'video', 10 * 1024 * 1024).ok).toBe(
      true
    );
    expect(checkAssetLimit(projectWithAssets(assets), 'video', 30 * 1024 * 1024).ok).toBe(
      false
    );
    expect(checkAssetLimit(projectWithAssets(), 'video', 21 * 1024 * 1024).ok).toBe(
      false
    );
  });

  it('enforces the font cap', () => {
    const assets = {
      a_1: { id: 'a_1', kind: 'font', bytes: 1 },
      a_2: { id: 'a_2', kind: 'font', bytes: 1 }
    };
    expect(checkAssetLimit(projectWithAssets(assets), 'font', 1).ok).toBe(false);
  });

  it('rejects a file over the hard file limit', () => {
    expect(checkAssetLimit(projectWithAssets(), 'image', LIMITS.fileBytes + 1).ok).toBe(
      false
    );
  });

  it('finds an asset by hash', () => {
    const project = projectWithAssets({
      a_1: { id: 'a_1', hash: 'same', kind: 'image', bytes: 1 }
    });
    expect(findAssetByHash(project, 'same').id).toBe('a_1');
    expect(findAssetByHash(project, 'other')).toBe(null);
  });
});

describe('hashing', () => {
  it('returns a stable sha-256 hex string', async () => {
    const hash = await sha256Hex(new TextEncoder().encode('hola'));
    expect(hash).toHaveLength(64);
    expect(hash).toBe(await sha256Hex(new TextEncoder().encode('hola')));
    expect(toBytes(new TextEncoder().encode('hola')).byteLength).toBe(4);
  });
});
