import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { readCollectionZip } from '../src/lib/platform/web/collection-zip.js';

function zip(files) {
  const bytes = zipSync(files);
  return new File([bytes], 'collection.zip', { type: 'application/zip' });
}

describe('collection ZIP', () => {
  it('reads the CSV and images while reducing paths to filenames', async () => {
    const file = zip({
      'fichas.csv': strToU8('code,label,image\nOBJ-001,Retrato,retrato.png\n'),
      'images/retrato.png': new Uint8Array([1, 2, 3]),
      'images/otra.jpg': new Uint8Array([4, 5])
    });
    const result = await readCollectionZip(file);
    expect(result.csvName).toBe('fichas.csv');
    expect(result.csvText).toContain('OBJ-001');
    expect(result.images.map((image) => image.name)).toEqual(['retrato.png', 'otra.jpg']);
    expect(result.totalImageBytes).toBe(5);
  });

  it('requires exactly one unambiguous CSV', async () => {
    const file = zip({
      'a.csv': strToU8('code,label\nA,B\n'),
      'b.csv': strToU8('code,label\nC,D\n')
    });
    await expect(readCollectionZip(file)).rejects.toThrow('varios CSV');
    const noCsv = zip({ 'images/a.png': new Uint8Array([1]) });
    await expect(readCollectionZip(noCsv)).rejects.toThrow('no contiene');
  });
});
