<script>
  import { platform } from '../../lib/platform/index.js';
  import PageMiniature from '../shell/PageMiniature.svelte';

  let { item } = $props();
  let project = $state(null);

  $effect(() => {
    const id = item?.id;
    const stamp = item?.savedAt;
    let cancelled = false;
    project = null;
    if (!id) return;
    void stamp;
    platform.projects
      .load(id)
      .then((row) => {
        if (!cancelled && row?.project) project = row.project;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  });

  const startPage = $derived(
    project?.pages?.find((page) => page.id === project.startPageId) ?? project?.pages?.[0] ?? null
  );
</script>

{#if project && startPage}
  <div class="project-thumb">
    <PageMiniature {project} page={startPage} />
  </div>
{:else}
  <div class="project-thumb project-thumb--loading" aria-hidden="true"></div>
{/if}

<style>
  .project-thumb {
    position: absolute;
    inset: 0;
  }
  .project-thumb :global(.miniature) {
    width: 100%;
    height: 100%;
  }
  .project-thumb--loading {
    background: var(--cover-bg, var(--panel-3));
    opacity: 0.45;
  }
</style>
