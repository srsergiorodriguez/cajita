<script>
  import Dialog from '../ui/Dialog.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { BUILTIN_FONTS } from '../../lib/domain/elements.js';
  import licenseText from '../../../LICENSE?raw';
  import fontText from '../../assets/fonts/LICENSES.md?raw';

  let { open = $bindable(false) } = $props();

  const software = [
    ['Svelte', 'MIT'],
    ['Vite', 'MIT'],
    ['@sveltejs/vite-plugin-svelte', 'MIT'],
    ['fflate', 'MIT'],
    ['idb', 'ISC'],
    ['Vitest', 'MIT'],
    ['svelte-check', 'MIT'],
    ['Prettier', 'MIT']
  ];
</script>

<Dialog bind:open title={t('licenses.title')}>
  <div class="licenses">
    <section class="license-section">
      <h2>{t('licenses.app')}</h2>
      <p>{t('licenses.appBody')}</p>
      <p>
        <a href="https://github.com/srsergiorodriguez/cajita" target="_blank" rel="noopener noreferrer">
          {t('licenses.source')} ↗
        </a>
        ·
        <a href="https://polyformproject.org/licenses/noncommercial/1.0.0" target="_blank" rel="noopener noreferrer">
          PolyForm Noncommercial 1.0.0 ↗
        </a>
      </p>
      <details>
        <summary>{t('licenses.licenseText')}</summary>
        <pre>{licenseText}</pre>
      </details>
    </section>

    <section class="license-section">
      <h2>{t('licenses.fonts')}</h2>
      <p>{t('licenses.fontsBody')}</p>
      <p class="font-list">{BUILTIN_FONTS.map((font) => font.label).join(' · ')}</p>
      <details>
        <summary>{t('licenses.oflText')}</summary>
        <pre>{fontText}</pre>
      </details>
    </section>

    <section class="license-section">
      <h2>{t('licenses.software')}</h2>
      <p>{t('licenses.softwareBody')}</p>
      <ul class="software-list">
        {#each software as [name, license]}
          <li><span>{name}</span><span>{license}</span></li>
        {/each}
      </ul>
    </section>

    <section class="license-section">
      <h2>{t('licenses.output')}</h2>
      <p>{t('licenses.outputBody')}</p>
      <p>
        <a href="https://github.com/srsergiorodriguez/cajita/blob/main/OUTPUT-LICENSE.md" target="_blank" rel="noopener noreferrer">
          {t('licenses.outputLicense')} ↗
        </a>
      </p>
    </section>
  </div>
</Dialog>

<style>
  .licenses {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .license-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .license-section:not(:last-child) {
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--line-soft);
  }

  h2 {
    font-family: var(--font-wordmark);
    font-size: var(--text-lg);
    font-weight: var(--wordmark-weight);
    letter-spacing: var(--wordmark-tracking);
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: var(--text-xs);
    line-height: 1.45;
  }

  a {
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  a:hover {
    color: var(--accent);
  }

  .font-list {
    color: var(--ink-2);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    line-height: 1.6;
  }

  details {
    border-top: 1px solid var(--line-soft);
    padding-top: var(--space-2);
  }

  summary {
    color: var(--ink-2);
    font-size: var(--text-2xs);
    letter-spacing: 0.04em;
    cursor: pointer;
  }

  pre {
    max-height: 340px;
    margin: var(--space-2) 0 0;
    overflow: auto;
    padding: var(--space-2);
    border: 1px solid var(--line-soft);
    background: var(--panel);
    color: var(--ink-2);
    font-family: var(--font-ui);
    font-size: var(--text-3xs);
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .software-list {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--ink-2);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
  }

  .software-list li {
    display: contents;
  }

  .software-list li span:last-child {
    color: var(--muted);
    text-align: right;
  }
</style>
