<script>
  import { plural, t } from '../../lib/i18n/index.svelte.js';
  import { activePage, session } from '../../lib/state/project.svelte.js';

  const page = $derived(activePage());
  const pageIndex = $derived(
    Math.max(0, session.project?.pages.findIndex((item) => item.id === page?.id) ?? 0)
  );
  const pageCount = $derived(session.project?.pages.length ?? 0);
  const elementCount = $derived(page?.elements?.length ?? 0);
  const stage = $derived(session.project?.stage);
  const kicker = $derived(
    page ? `${session.project?.title ?? ''} / ${page.title}` : t('stage.kicker')
  );
</script>

<section class="desk" aria-label={t('stage.example')}>
  <div class="stage">
    <div class="page-toolbar" aria-hidden="true">
      <span>−</span><b>{t('stage.zoom')}</b><span>＋</span>
      <span>{t('stage.fit')}</span>
      <span class="on">{t('stage.grid')}</span>
      <span>{t('stage.snap')}</span>
      <span>{t('stage.links')}</span>
    </div>

    <span class="example-stamp">{t('stage.example')}</span>
    <span class="kicker">{kicker}</span>

    <div class="art-wrap">
      <div class="art">
        <span class="art-label">Retrato · sin título</span>
      </div>
      <div class="selection" aria-hidden="true">
        <span class="handle h-nw"></span>
        <span class="handle h-n"></span>
        <span class="handle h-ne"></span>
        <span class="handle h-e"></span>
        <span class="handle h-se"></span>
        <span class="handle h-s"></span>
        <span class="handle h-sw"></span>
        <span class="handle h-w"></span>
        <span class="rotate-line"></span>
        <span class="rotate-handle"></span>
        <span class="link-badge">→</span>
      </div>
    </div>

    <h1 class="bigtext">
      <span>{t('stage.titleLine1')}</span>
      <span class="em">{t('stage.titleLine2')}</span>
      <span>{t('stage.titleLine3')}</span>
    </h1>

    <p class="bodytext">{t('stage.body')}</p>

    <div class="sticker" aria-hidden="true">01</div>

    <div class="meta">
      <strong>{t('stage.metaTitle')}</strong>
      <span>{t('stage.metaSub')}</span>
    </div>

    <span class="page-number">
      {String(pageIndex + 1).padStart(2, '0')} / {String(pageCount).padStart(2, '0')}
    </span>
    <span class="stage-status">
      {stage?.width} × {stage?.height} ·
      {plural(elementCount, 'units.elementOne', 'units.elementMany')}
    </span>
  </div>

  <p class="soon-note">{t('stage.soon')}</p>
</section>

<style>
  .desk {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: var(--motif-desk);
  }

  .stage {
    position: relative;
    width: min(760px, calc(100% - 96px));
    aspect-ratio: 3 / 2;
    overflow: hidden;
    background: var(--stage);
    border: var(--border-strong) solid var(--line);
    box-shadow: var(--shadow-stage);
    container-type: size;
  }

  .page-toolbar {
    position: absolute;
    top: 2.4%;
    left: 2.4%;
    z-index: 8;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border: var(--border-control) solid var(--line);
    background: var(--panel);
    box-shadow: var(--toolbar-shadow);
  }

  .page-toolbar span,
  .page-toolbar b {
    padding: 2px 5px;
    font-size: var(--text-2xs);
    line-height: 1.2;
    font-weight: 400;
    white-space: nowrap;
  }

  .page-toolbar span {
    color: var(--muted);
  }

  .page-toolbar b {
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--ink);
  }

  .page-toolbar .on {
    border: 1px solid var(--line);
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 700;
  }

  .example-stamp {
    position: absolute;
    top: 2.4%;
    right: 2.4%;
    z-index: 8;
    padding: 2px 5px;
    border: 1px solid var(--stamp-ink);
    background: var(--stamp-bg);
    color: var(--stamp-ink);
    font-size: var(--text-3xs);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transform: rotate(2deg);
  }

  .kicker {
    position: absolute;
    top: 4.6%;
    left: 63%;
    z-index: 4;
    color: var(--muted);
    font-size: 1.15cqw;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .art-wrap {
    position: absolute;
    top: 13%;
    left: 8.4%;
    width: 51.3%;
    height: 49.3%;
    transform: rotate(-3deg);
    z-index: 2;
  }

  .art {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border: 2px solid var(--ink);
    background:
      radial-gradient(circle at 72% 30%, var(--accent-3) 0 17%, transparent 17.6%),
      radial-gradient(circle at 26% 76%, var(--ink) 0 13%, transparent 13.6%),
      linear-gradient(
        135deg,
        var(--accent) 0 46%,
        color-mix(in srgb, var(--accent) 28%, var(--panel)) 46% 58%,
        var(--accent-2) 58% 100%
      );
  }

  .art::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
      color-mix(in srgb, var(--ink) 35%, transparent) 0.7px,
      transparent 1px
    );
    background-size: 5px 5px;
    opacity: 0.3;
    mix-blend-mode: multiply;
  }

  .art-label {
    position: absolute;
    left: 0;
    bottom: 0;
    padding: 2px 4px;
    border-top: 1px solid var(--ink);
    border-right: 1px solid var(--ink);
    background: var(--panel);
    color: var(--ink);
    font-size: 1.05cqw;
    letter-spacing: 0.02em;
  }

  .selection {
    position: absolute;
    inset: -1px;
    border: 2px solid var(--selection);
    pointer-events: none;
    z-index: 3;
  }

  .handle {
    position: absolute;
    width: 8px;
    height: 8px;
    border: 2px solid var(--ink);
    background: var(--panel-2);
  }

  .h-nw {
    left: -5px;
    top: -5px;
  }
  .h-n {
    left: 50%;
    top: -5px;
    margin-left: -4px;
  }
  .h-ne {
    right: -5px;
    top: -5px;
  }
  .h-e {
    right: -5px;
    top: 50%;
    margin-top: -4px;
  }
  .h-se {
    right: -5px;
    bottom: -5px;
  }
  .h-s {
    left: 50%;
    bottom: -5px;
    margin-left: -4px;
  }
  .h-sw {
    left: -5px;
    bottom: -5px;
  }
  .h-w {
    left: -5px;
    top: 50%;
    margin-top: -4px;
  }

  .rotate-handle {
    position: absolute;
    left: 50%;
    top: -28px;
    width: 18px;
    height: 18px;
    margin-left: -9px;
    border: 2px solid var(--ink);
    border-radius: 50%;
    background: var(--accent);
  }

  .rotate-line {
    position: absolute;
    left: 50%;
    top: -10px;
    width: 1px;
    height: 10px;
    background: var(--ink);
  }

  .link-badge {
    position: absolute;
    right: -12px;
    top: -12px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 2px solid var(--ink);
    background: var(--selection);
    color: var(--selection-ink);
    font-size: var(--text-2xs);
    box-shadow: 2px 2px 0 var(--ink);
  }

  .bigtext {
    position: absolute;
    top: 12%;
    left: 63%;
    z-index: 3;
    display: flex;
    flex-direction: column;
    width: 31%;
    color: var(--ink);
    font-family: var(--font-wordmark);
    font-size: 4.45cqw;
    font-weight: var(--wordmark-weight);
    letter-spacing: -0.045em;
    line-height: 0.94;
    text-shadow: var(--wordmark-shadow);
  }

  .bigtext .em {
    color: var(--accent-2);
    font-family: var(--font-serif);
    font-style: italic;
    font-weight: 400;
    letter-spacing: -0.03em;
    text-shadow: none;
  }

  .bodytext {
    position: absolute;
    top: 42%;
    left: 63.6%;
    z-index: 3;
    width: 28%;
    padding-left: 1.2cqw;
    border-left: 2px solid var(--accent-2);
    color: var(--ink);
    font-family: var(--font-serif);
    font-size: 1.45cqw;
    line-height: 1.35;
  }

  .sticker {
    position: absolute;
    top: 63%;
    left: 83%;
    z-index: 4;
    display: grid;
    place-items: center;
    width: 7.3cqw;
    height: 7.3cqw;
    border: 2px solid var(--ink);
    border-radius: 50%;
    background: var(--accent-3);
    color: var(--ink);
    font-family: var(--font-wordmark);
    font-size: 2.2cqw;
    transform: rotate(8deg);
    box-shadow: var(--shadow-card);
  }

  .meta {
    position: absolute;
    top: 64%;
    left: 63.6%;
    z-index: 4;
    display: flex;
    flex-direction: column;
    padding: 4px 5px;
    border: 1px solid var(--ink);
    background: var(--panel-2);
    box-shadow: var(--shadow-card);
    transform: rotate(-2deg);
  }

  .meta strong {
    color: var(--ink);
    font-size: 1.05cqw;
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  .meta span {
    color: var(--muted);
    font-size: 0.95cqw;
  }

  .page-number {
    position: absolute;
    right: 3.5%;
    bottom: 4%;
    color: var(--muted);
    font-size: 1cqw;
    letter-spacing: 0.08em;
  }

  .stage-status {
    position: absolute;
    left: 2.4%;
    bottom: 3.4%;
    padding: 2px 4px;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--ink);
    font-size: 0.95cqw;
  }

  .soon-note {
    position: absolute;
    bottom: var(--space-3);
    left: 50%;
    transform: translateX(-50%);
    padding: 2px 6px;
    border: 1px solid var(--line-soft);
    background: var(--panel);
    color: var(--ink-2);
    font-size: var(--text-2xs);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  @media (max-height: 720px) {
    .soon-note {
      display: none;
    }
  }
</style>
