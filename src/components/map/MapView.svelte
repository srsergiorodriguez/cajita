<script>
  import Icon from '../ui/Icon.svelte';
  import { plural, t } from '../../lib/i18n/index.svelte.js';
  import { buildLinkGraph } from '../../lib/domain/links.js';
  import { routeEdge } from '../../lib/domain/map-route.js';
  import { session, setActivePage } from '../../lib/state/project.svelte.js';
  import { setView } from '../../lib/state/editor.svelte.js';

  const CARD_W = 232;
  const CARD_H = 126;
  const GAP_X = 58;
  const GAP_Y = 64;
  const PAD = 38;

  const graph = $derived(buildLinkGraph(session.project));
  const columns = $derived(
    Math.min(3, Math.max(1, Math.ceil(Math.sqrt(graph.nodes.length))))
  );
  const rows = $derived(Math.ceil(graph.nodes.length / columns));

  const positions = $derived(
    new Map(
      graph.nodes.map((node, index) => [
        node.pageId,
        {
          x: PAD + (index % columns) * (CARD_W + GAP_X),
          y: PAD + Math.floor(index / columns) * (CARD_H + GAP_Y)
        }
      ])
    )
  );

  const planeWidth = $derived(
    PAD * 2 + columns * CARD_W + Math.max(0, columns - 1) * GAP_X
  );
  const planeHeight = $derived(PAD * 2 + rows * CARD_H + Math.max(0, rows - 1) * GAP_Y);

  const wires = $derived(
    graph.edges
      .filter(
        (edge) =>
          edge.target.kind === 'page' &&
          edge.target.pageId !== edge.pageId &&
          positions.has(edge.target.pageId)
      )
      .map((edge, index) => {
        const from = positions.get(edge.pageId);
        const to = positions.get(edge.target.pageId);
        const fromColumn =
          graph.nodes.findIndex((node) => node.pageId === edge.pageId) % columns;
        return {
          ...edge,
          ...routeEdge({
            from,
            to,
            fromColumn,
            columns,
            cardW: CARD_W,
            cardH: CARD_H,
            gapX: GAP_X,
            gapY: GAP_Y,
            index
          })
        };
      })
  );

  function pageFor(pageId) {
    return session.project.pages.find((page) => page.id === pageId);
  }

  function openPage(pageId) {
    setActivePage(pageId);
    setView('page');
  }

  function nodeIndex(pageId) {
    return graph.nodes.findIndex((node) => node.pageId === pageId);
  }
</script>

<section class="map-desk" aria-label={t('map.title')}>
  <header class="map-head">
    <div>
      <span class="mono-label">{t('map.title')}</span>
      <p class="map-lede">{t('map.lede')}</p>
    </div>
    <div class="map-legend">
      {#if graph.orphans.length}
        <span class="badge warn"
          >{t('map.orphanCount', { count: graph.orphans.length })}</span
        >
      {/if}
      {#if graph.broken.length}
        <span class="badge danger"
          >{t('map.brokenCount', { count: graph.broken.length })}</span
        >
      {/if}
      <span class="muted">{t('map.openHint')}</span>
    </div>
  </header>

  <div class="map-scroll">
    <div
      class="map-plane"
      style:width={`${planeWidth}px`}
      style:height={`${planeHeight}px`}
    >
      <svg
        class="wires"
        width={planeWidth}
        height={planeHeight}
        viewBox={`0 0 ${planeWidth} ${planeHeight}`}
        aria-hidden="true"
      >
        <defs>
          <marker
            id="map-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 8 4 0 8z" fill="var(--muted)" />
          </marker>
        </defs>
        {#each wires as wire (wire.pageId + wire.elementId)}
          <path d={wire.d} marker-end="url(#map-arrow)" />
        {/each}
      </svg>

      {#each graph.nodes as node (node.pageId)}
        {@const position = positions.get(node.pageId)}
        {@const page = pageFor(node.pageId)}
        <button
          type="button"
          class="map-card"
          class:start={node.start}
          class:orphan={node.orphan}
          class:broken={node.broken > 0}
          style:left={`${position.x}px`}
          style:top={`${position.y}px`}
          onclick={() => openPage(node.pageId)}
        >
          <span class="card-index"
            >{String(nodeIndex(node.pageId) + 1).padStart(2, '0')}</span
          >
          {#if node.start}<span class="start-stamp">{t('left.start')}</span>{/if}
          <strong>{node.title}</strong>
          <span class="card-slug">/{node.slug}</span>

          <span class="card-meta">
            <span
              >{plural(
                page?.elements?.length ?? 0,
                'units.elementOne',
                'units.elementMany'
              )}</span
            >
            <span>·</span>
            <span>{plural(node.outbound, 'units.linkOne', 'units.linkMany')}</span>
          </span>

          <span class="card-links">
            {#if node.external}<span><Icon name="link" size={11} /> {node.external}</span
              >{/if}
            {#if node.cards}<span><Icon name="text" size={11} /> {node.cards}</span>{/if}
            {#if node.orphan}<span class="flag">{t('map.orphan')}</span>{/if}
            {#if node.broken > 0}<span class="flag danger">{t('map.broken')}</span>{/if}
            <span class="inbound"
              >{plural(node.inbound, 'units.inboundOne', 'units.inboundMany')}</span
            >
          </span>
        </button>
      {/each}
    </div>
  </div>
</section>

<style>
  .map-desk {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--motif-desk);
  }

  .map-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--line-soft);
    background: var(--panel);
  }

  .map-lede {
    max-width: 46ch;
    margin-top: 2px;
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .map-legend {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-2);
    font-size: var(--text-2xs);
  }

  .muted {
    color: var(--muted);
  }

  .badge {
    padding: 1px 5px;
    border: 1px solid var(--line);
    background: var(--panel-2);
    font-size: var(--text-3xs);
    text-transform: uppercase;
  }

  .badge.warn {
    border-color: var(--warning);
    color: var(--warning);
  }

  .badge.danger {
    border-color: var(--danger);
    color: var(--danger);
  }

  .map-scroll {
    min-height: 0;
    overflow: auto;
    padding: var(--space-4);
    scrollbar-width: thin;
    scrollbar-color: var(--line-soft) transparent;
  }

  .map-plane {
    position: relative;
    min-width: 100%;
  }

  .wires {
    position: absolute;
    inset: 0;
    overflow: visible;
    pointer-events: none;
  }

  .wires > path {
    fill: none;
    stroke: var(--muted);
    stroke-width: 1.5;
    stroke-linejoin: round;
    opacity: 0.65;
  }

  .map-card {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 232px;
    height: 126px;
    padding: var(--space-3);
    border: var(--border-control) solid var(--line);
    border-radius: 0;
    background: var(--panel-2);
    box-shadow: var(--shadow-card);
    color: var(--ink);
    font-family: var(--font-ui);
    text-align: left;
    overflow: hidden;
  }

  .map-card:hover,
  .map-card:focus-visible {
    outline: 2px solid var(--selection);
    outline-offset: 2px;
    background: var(--active-wash);
  }

  .map-card.start {
    border-left: 4px solid var(--accent);
  }

  .map-card.orphan {
    border-style: dashed;
  }

  .map-card.broken {
    border-color: var(--danger);
  }

  .card-index {
    color: var(--muted);
    font-size: var(--text-3xs);
    letter-spacing: 0.1em;
  }

  .start-stamp {
    position: absolute;
    right: var(--space-2);
    top: var(--space-2);
    padding: 1px 4px;
    background: var(--stamp-bg);
    color: var(--stamp-ink);
    font-size: var(--text-3xs);
    text-transform: uppercase;
    transform: rotate(2deg);
  }

  .map-card strong {
    overflow: hidden;
    max-width: 100%;
    margin-top: var(--space-1);
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-weight: 700;
    line-height: 1.05;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-slug {
    overflow: hidden;
    max-width: 100%;
    color: var(--muted);
    font-size: var(--text-3xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-meta,
  .card-links {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    max-width: 100%;
    margin-top: auto;
    color: var(--muted);
    font-size: var(--text-3xs);
    white-space: nowrap;
  }

  .card-links {
    gap: var(--space-1);
    margin-top: 3px;
  }

  .card-links span {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .inbound {
    margin-left: auto;
  }

  .flag {
    color: var(--warning);
    font-size: var(--text-3xs);
    text-transform: uppercase;
  }

  .flag.danger {
    color: var(--danger);
  }
</style>
