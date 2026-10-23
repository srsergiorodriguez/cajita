import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { TUTORIAL_STEPS } from '../src/lib/tutorial.js';
import { es } from '../src/lib/i18n/es.js';
import { en } from '../src/lib/i18n/en.js';

describe('tutorial', () => {
  it('has a screenshot and both translations for every step', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(existsSync(join('public/tutorial', step.image)), step.image).toBe(true);
      expect(es[step.titleKey], step.titleKey).toBeTruthy();
      expect(es[step.bodyKey], step.bodyKey).toBeTruthy();
      expect(en[step.titleKey], step.titleKey).toBeTruthy();
      expect(en[step.bodyKey], step.bodyKey).toBeTruthy();
    }
  });
});
