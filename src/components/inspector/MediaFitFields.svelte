<script>
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';

  let { value = 'contain', onchange = null, drawing = false, onedit = null } = $props();
</script>

<div class="media-fit">
  <SegmentedControl
    label={t('image.fit')}
    {value}
    options={[
      { value: 'cover', label: t('image.cover') },
      { value: 'contain', label: t('image.contain') }
    ]}
    onchange={(next) => onchange?.(next)}
  />
  {#if drawing}
    <Button size="sm" variant="secondary" onclick={onedit}>
      <Icon name="pencil" size={12} />{t('drawing.edit')}
    </Button>
  {/if}
</div>

<style>
  .media-fit {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    align-items: flex-start;
  }
</style>
