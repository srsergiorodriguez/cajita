<script>
  import { platform } from '../../lib/platform/index.js';
  import { HTML_SANDBOX } from '../../lib/domain/html.js';

  let { projectId, assetId, title = 'HTML' } = $props();
  let html = $state(null);
  let failed = $state(false);
  let loadedKey = $state('');

  $effect(() => {
    const key = `${projectId}:${assetId}`;
    let cancelled = false;
    if (loadedKey !== key) {
      loadedKey = key;
      html = null;
      failed = false;
    }
    platform.assets
      .get(projectId, assetId)
      .then(async (row) => {
        if (cancelled) return;
        if (!row?.blob) {
          failed = true;
          return;
        }
        html = await row.blob.text();
      })
      .catch(() => {
        if (!cancelled) failed = true;
      });
    return () => {
      cancelled = true;
    };
  });
</script>

{#if html !== null}
  <iframe
    srcdoc={html}
    title={title}
    sandbox={HTML_SANDBOX}
    referrerpolicy="no-referrer"
    loading="lazy"
  ></iframe>
{:else if failed}
  <span class="missing">HTML</span>
{:else}
  <span class="loading" aria-hidden="true"></span>
{/if}

<style>
  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #fff;
    pointer-events: none;
  }
  .missing,
  .loading {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    background: #fff;
    color: var(--muted);
    font-size: var(--text-2xs);
  }
  .loading {
    animation: pulse 1.2s ease-in-out infinite alternate;
  }
  @keyframes pulse {
    to {
      opacity: 0.45;
    }
  }
</style>
