<script>
  let {
    frames = [],
    activeFrameId = '',
    isButton = false,
    labelFor = (frame) => frame.name,
    durationLabel = (frame) => `${frame.duration}ms`,
    onselect = null,
    onreorder = null
  } = $props();

  let draggingId = $state(null);
  let overId = $state(null);

  function drop(targetId) {
    if (!draggingId || draggingId === targetId) {
      draggingId = null;
      overId = null;
      return;
    }
    onreorder?.(draggingId, targetId);
    draggingId = null;
    overId = null;
  }
</script>

<div class="frame-timeline" class:frame-timeline--button={isButton} role="tablist">
  {#each frames as frame (frame.id)}
    <button
      type="button"
      class="frame-segment"
      class:active={frame.id === activeFrameId}
      class:dragging={draggingId === frame.id}
      class:drag-over={overId === frame.id}
      style:flex-grow={isButton ? 1 : Math.max(1, Number(frame.duration) || 1)}
      role="tab"
      aria-selected={frame.id === activeFrameId}
      title={labelFor(frame)}
      draggable={!isButton}
      ondragstart={(event) => {
        if (isButton) return;
        draggingId = frame.id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', frame.id);
      }}
      ondragover={(event) => {
        if (isButton) return;
        event.preventDefault();
        overId = frame.id;
      }}
      ondragleave={() => {
        if (overId === frame.id) overId = null;
      }}
      ondrop={(event) => {
        if (isButton) return;
        event.preventDefault();
        drop(frame.id);
      }}
      ondragend={() => {
        draggingId = null;
        overId = null;
      }}
      onclick={() => onselect?.(frame.id)}
    >
      <span class="frame-name">{labelFor(frame)}</span>
      {#if !isButton}
        <span class="frame-duration">{durationLabel(frame)}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .frame-timeline {
    display: flex;
    align-items: stretch;
    gap: 2px;
    min-width: 0;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }

  .frame-segment {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 1px;
    min-width: 82px;
    min-height: 42px;
    padding: 5px 8px;
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--ink);
    font-family: var(--font-ui);
    text-align: left;
    cursor: grab;
  }

  .frame-segment:active {
    cursor: grabbing;
  }

  .frame-segment.active {
    border-color: var(--selection);
    background: var(--active-wash);
  }

  .frame-segment.dragging {
    opacity: 0.45;
  }

  .frame-segment.drag-over {
    box-shadow: inset 0 0 0 1px var(--selection);
  }

  .frame-name {
    max-width: 100%;
    overflow: hidden;
    font-size: var(--text-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .frame-duration {
    color: var(--muted);
    font-size: var(--text-3xs);
    font-variant-numeric: tabular-nums;
  }

  .frame-timeline--button .frame-segment {
    align-items: center;
    cursor: pointer;
  }

  .frame-timeline--button .frame-name {
    font-size: var(--text-2xs);
  }
</style>
