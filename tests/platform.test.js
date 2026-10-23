import { describe, expect, it } from 'vitest';
import { createFakePlatform, PLATFORM } from '../src/lib/platform/types.js';

describe('fake platform', () => {
  it('round-trips a project and an asset', async () => {
    const platform = createFakePlatform();
    const project = { id: 'p_1', title: 'Casa sin prisa' };

    await platform.projects.save(project);
    const loaded = await platform.projects.load('p_1');
    expect(loaded.title).toBe('Casa sin prisa');

    await platform.assets.put('a_1', new Blob(['hola']));
    const blob = await platform.assets.get('a_1');
    expect(await blob.text()).toBe('hola');

    const usage = await platform.assets.usage();
    expect(usage.count).toBe(1);
    expect(usage.bytes).toBe(4);
  });

  it('keeps the GitHub token outside the project', async () => {
    const platform = createFakePlatform();
    expect(await platform.secrets.getGithubToken()).toBeNull();
    await platform.secrets.setGithubToken('secret');
    expect(await platform.secrets.getGithubToken()).toBe('secret');
    await platform.secrets.clearGithubToken();
    expect(await platform.secrets.getGithubToken()).toBeNull();
  });

  it('declares the web platform kind', () => {
    expect(createFakePlatform().kind).toBe(PLATFORM.WEB);
  });
});
