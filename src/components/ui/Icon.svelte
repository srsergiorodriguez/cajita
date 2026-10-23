<script>
  let { name, size = 16, stroke = 1.75, label } = $props();
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={stroke}
  stroke-linecap="square"
  stroke-linejoin="miter"
  aria-hidden={label ? undefined : 'true'}
  role={label ? 'img' : undefined}
>
  {#if label}<title>{label}</title>{/if}

  {#if name === 'undo'}
    <path d="M9 7 4 12l5 5" />
    <path d="M4 12h9a6 6 0 0 1 6 6v1" />
  {:else if name === 'redo'}
    <path d="m15 7 5 5-5 5" />
    <path d="M20 12h-9a6 6 0 0 0-6 6v1" />
  {:else if name === 'pause'}
    <path d="M8 5v14M16 5v14" />
  {:else if name === 'play'}
    <path d="M8 5v14l11-7z" />
  {:else if name === 'download'}
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 20h16" />
  {:else if name === 'folder'}
    <path d="M3 6h7l2 2h9v12H3z" />
    <path d="M3 10h18" />
  {:else if name === 'publish'}
    <path d="M12 21V9" />
    <path d="m7 14 5-5 5 5" />
    <path d="M4 4h16" />
  {:else if name === 'pages'}
    <rect x="4" y="5" width="16" height="14" />
    <path d="M8 3h12v12" />
    <path d="M8 10h8M8 14h5" />
  {:else if name === 'panel'}
    <rect x="3" y="4" width="18" height="16" />
    <path d="M15 4v16" />
    <path d="M6 8h5M6 12h5M6 16h5" />
  {:else if name === 'page'}
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
  {:else if name === 'map'}
    <circle cx="6" cy="7" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="12" cy="18" r="2.5" />
    <path d="m8 8 2.5 7.5M16 8l-2.5 7.5M8.5 7h7" />
  {:else if name === 'settings'}
    <path d="M4 7h16M4 12h16M4 17h16" />
    <circle cx="9" cy="7" r="2" fill="var(--panel)" />
    <circle cx="15" cy="12" r="2" fill="var(--panel)" />
    <circle cx="7" cy="17" r="2" fill="var(--panel)" />
  {:else if name === 'sun'}
    <circle cx="12" cy="12" r="4" />
    <path
      d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
    />
  {:else if name === 'moon'}
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  {:else if name === 'theme'}
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
  {:else if name === 'image'}
    <rect x="3" y="4" width="18" height="16" />
    <circle cx="8" cy="9" r="1.5" />
    <path d="m3 17 5-5 4 4 3-3 6 6" />
  {:else if name === 'align-left'}
    <path d="M4 6h16M4 10h10M4 14h16M4 18h7" />
  {:else if name === 'align-center'}
    <path d="M4 6h16M7 10h10M4 14h16M8.5 18h7" />
  {:else if name === 'align-right'}
    <path d="M4 6h16M10 10h10M4 14h16M13 18h7" />
  {:else if name === 'archive'}
    <path d="M3 7h18v4H3zM5 11v8h14v-8M9 15h6" />
  {:else if name === 'shape'}
    <circle cx="7" cy="7" r="4" />
    <path d="M15 12l5 8H10l5-8z" />
  {:else if name === 'chart'}
    <path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" />
  {:else if name === 'text'}
    <path d="M5 5h14M12 5v14M8 19h8" />
  {:else if name === 'video'}
    <rect x="3" y="5" width="18" height="14" />
    <path d="m10 9 5 3-5 3z" fill="currentColor" />
  {:else if name === 'sound'}
    <path d="M4 10v4h4l5 4V6L8 10z" />
    <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
  {:else if name === 'media'}
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  {:else if name === 'plus'}
    <path d="M12 5v14M5 12h14" />
  {:else if name === 'close'}
    <path d="m6 6 12 12M18 6 6 18" />
  {:else if name === 'chevron-left'}
    <path d="m15 6-6 6 6 6" />
  {:else if name === 'chevron-right'}
    <path d="m9 6 6 6-6 6" />
  {:else if name === 'chevron-up'}
    <path d="m6 15 6-6 6 6" />
  {:else if name === 'chevron'}
    <path d="m7 9 5 5 5-5" />
  {:else if name === 'link'}
    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
  {:else if name === 'eye'}
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.5" />
  {:else if name === 'language'}
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
  {:else if name === 'code'}
    <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
  {:else if name === 'eye-off'}
    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 4.2M6.2 6.2C3.7 8 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.1-.8" />
  {:else if name === 'lock'}
    <rect x="5" y="10" width="14" height="10" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  {:else if name === 'trash'}
    <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
  {:else if name === 'duplicate'}
    <rect x="8" y="8" width="12" height="12" />
    <path d="M16 8V4H4v12h4" />
  {:else if name === 'external'}
    <path
      d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"
    />
  {:else if name === 'grip'}
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
  {:else if name === 'menu'}
    <path d="M4 7h16M4 12h16M4 17h16" />
  {:else if name === 'minus'}
    <path d="M5 12h14" />
  {:else}
    <rect x="4" y="4" width="16" height="16" />
  {/if}
</svg>

<style>
  .icon {
    display: block;
    flex: 0 0 auto;
  }
</style>
