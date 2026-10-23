<script>
  import IconButton from './IconButton.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';

  let { message, type = 'info', ondismiss } = $props();
</script>

<div class="toast toast--{type}" role={type === 'error' ? 'alert' : 'status'}>
  <span class="bar"></span>
  <p>{message}</p>
  <IconButton
    label={t('common.close')}
    icon="close"
    variant="bare"
    size={24}
    tipPosition="top"
    iconSize={12}
    onclick={ondismiss}
  />
</div>

<style>
  .toast {
    display: grid;
    grid-template-columns: 4px 1fr auto;
    align-items: start;
    gap: var(--space-2);
    width: min(340px, calc(100vw - 32px));
    border: var(--border-control) solid var(--line);
    background: var(--panel-2);
    box-shadow: var(--shadow-card);
    padding: var(--space-2);
  }

  .bar {
    width: 4px;
    height: 100%;
    min-height: 24px;
    background: var(--ink);
  }

  .toast--success .bar {
    background: var(--success);
  }

  .toast--error .bar {
    background: var(--danger);
  }

  p {
    align-self: center;
    font-size: var(--text-xs);
    line-height: var(--leading-ui);
  }
</style>
