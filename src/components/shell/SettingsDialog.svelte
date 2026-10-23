<script>
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import RangeField from '../ui/RangeField.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import LicensesDialog from './LicensesDialog.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import {
    preferences,
    setMode,
    setLocale,
    setUiScale
  } from '../../lib/state/preferences.svelte.js';

  let { open = $bindable(false) } = $props();
  let licensesOpen = $state(false);
</script>

<Dialog bind:open title={t('settings.title')}>
  <section class="settings-section">
    <h2>{t('settings.appearance')}</h2>
    <div class="setting-row">
      <div>
        <span class="setting-label">{t('settings.mode')}</span>
        <p>{t('settings.modeHint')}</p>
      </div>
      <SegmentedControl
        label={t('settings.mode')}
        value={preferences.mode}
        options={[
          { value: 'light', label: t('mode.light') },
          { value: 'dark', label: t('mode.dark') }
        ]}
        onchange={setMode}
      />
    </div>
    <RangeField
      label={t('settings.uiScale')}
      hint={t('settings.uiScaleHint')}
      value={preferences.uiScale}
      oninput={setUiScale}
    />
  </section>

  <section class="settings-section">
    <h2>{t('settings.language')}</h2>
    <div class="setting-row">
      <div>
        <span class="setting-label">{t('settings.language')}</span>
        <p>{t('settings.languageHint')}</p>
      </div>
      <SegmentedControl
        label={t('settings.language')}
        value={preferences.locale}
        options={[
          { value: 'es', label: t('lang.es') },
          { value: 'en', label: t('lang.en') }
        ]}
        onchange={setLocale}
      />
    </div>
  </section>

  <section class="settings-section">
    <h2>{t('settings.about')}</h2>
    <p>{t('settings.aboutText')}</p>
    <p class="about-by">{t('settings.aboutBy')}</p>
    <p class="about-links">
      <a href="https://srsergiorodriguez.github.io/" target="_blank" rel="noopener noreferrer">
        {t('settings.portfolio')} ↗
      </a>
    </p>
    <p class="version">{t('app.version')}</p>
  </section>

  <section class="settings-section">
    <h2>{t('settings.licenses')}</h2>
    <p>{t('settings.licensesHint')}</p>
    <Button variant="secondary" size="sm" onclick={() => (licensesOpen = true)}>
      {t('settings.licensesOpen')}
    </Button>
  </section>
</Dialog>

<LicensesDialog bind:open={licensesOpen} />

<style>
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--line-soft);
  }

  .settings-section:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  h2 {
    font-family: var(--font-wordmark);
    font-size: var(--text-lg);
    font-weight: var(--wordmark-weight);
    letter-spacing: var(--wordmark-tracking);
  }

  p {
    color: var(--muted);
    font-size: var(--text-xs);
    line-height: 1.45;
  }

  .setting-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-5);
  }

  .setting-label {
    display: block;
    margin-bottom: 2px;
    color: var(--ink);
    font-size: var(--text-2xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .version {
    color: var(--ink-2);
    font-size: var(--text-2xs);
  }

  @media (max-width: 520px) {
    .setting-row {
      flex-direction: column;
      gap: var(--space-2);
    }
  }
  .about-by {
    margin: 0;
  }
  .about-links {
    margin: 0;
  }
  .about-links a {
    color: var(--selection);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
