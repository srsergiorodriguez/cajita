<script>
  import Dialog from '../ui/Dialog.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import { TUTORIAL_STEPS } from '../../lib/tutorial.js';

  let { open = $bindable(false) } = $props();
  const base = import.meta.env.BASE_URL;
</script>

<Dialog bind:open title={t('tutorial.title')} wide>
  <div class="tutorial">
    <p class="lede">{t('tutorial.intro')}</p>
    {#each TUTORIAL_STEPS as step, index (step.id)}
      <article class="step">
        <header class="step-head">
          <span class="step-number">{String(index + 1).padStart(2, '0')}</span>
          <h2>{t(step.titleKey)}</h2>
        </header>
        <p class="body">{t(step.bodyKey)}</p>
        <a class="shot" href={`${base}tutorial/${step.image}`} target="_blank" rel="noopener noreferrer">
          <img
            src={`${base}tutorial/${step.image}`}
            alt={t(step.titleKey)}
            loading="lazy"
          />
        </a>
      </article>
    {/each}
  </div>
</Dialog>

<style>
  .tutorial {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    max-width: 960px;
    margin: 0 auto;
  }
  .lede {
    margin: 0;
    color: var(--muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }
  .step {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-5);
    border-bottom: 1px solid var(--line-soft);
  }
  .step:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }
  .step-head {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }
  .step-number {
    color: var(--accent);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: 0.08em;
  }
  h2 {
    margin: 0;
    font-family: var(--font-wordmark);
    font-size: var(--text-xl);
    font-weight: var(--wordmark-weight);
    letter-spacing: var(--wordmark-tracking);
  }
  .body {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--text-xs);
    line-height: 1.55;
  }
  .shot {
    display: block;
    margin-top: var(--space-2);
    border: 1px solid var(--line);
    background: var(--panel);
    line-height: 0;
  }
  .shot:hover {
    border-color: var(--selection);
  }
  img {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
