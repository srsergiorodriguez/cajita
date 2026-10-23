import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url).pathname;
const themes = [
  join(root, 'src/styles/themes/ficha.css'),
  join(root, 'src/styles/themes/ficha-dark.css')
];

function tokenNames(path) {
  const css = readFileSync(path, 'utf8');
  return [...css.matchAll(/--([a-z0-9-]+)\s*:/g)].map((match) => match[1]).sort();
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...walk(path));
    } else if (path.endsWith('.svelte')) {
      files.push(path);
    }
  }
  return files;
}

describe('themes', () => {
  it('declare exactly the same semantic tokens', () => {
    const [light, dark] = themes.map(tokenNames);
    expect(light.length).toBeGreaterThan(25);
    expect(dark).toEqual(light);
  });

  it('do not leave an empty token value', () => {
    for (const path of themes) {
      const css = readFileSync(path, 'utf8');
      expect(css).not.toMatch(/--[a-z0-9-]+\s*:\s*;/);
    }
  });

  it('are not restyled component by component', () => {
    const components = walk(join(root, 'src'));
    for (const path of components) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toContain('[data-theme=');
      expect(source, path).not.toContain('[data-mode=');
    }
  });
});
