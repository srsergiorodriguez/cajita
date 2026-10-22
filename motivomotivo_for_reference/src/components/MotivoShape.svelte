<script>
  import { appState } from '$stores/appState.svelte.js';
  let { shape, color, s } = $props();
</script>

{#if appState.shapePack === 'playful'}
  {#if shape === 0}
    <polygon points="0,{-s/2} {s/2},0 0,{s/2} {-s/2},0" fill={appState.palette[color]} />
  {:else if shape === 1}
    <g fill={appState.palette[color]}>
      <rect x={-s/6} y={-s/2} width={s/3} height={s} />
      <rect x={-s/2} y={-s/6} width={s} height={s/3} />
    </g>
  {:else if shape === 2}
    <polygon points="0,{-s/2} {s*0.433},{-s*0.25} {s*0.433},{s*0.25} 0,{s/2} {-s*0.433},{s*0.25} {-s*0.433},{-s*0.25}" fill={appState.palette[color]} />
  {:else if shape === 3}
    <path d="M {-s/2},{s/2} A {s/2} {s/2} 0 0 1 {s/2},{s/2} Z" fill={appState.palette[color]} />
  {/if}

{:else if appState.shapePack === 'organic'}
  {#if shape === 0}
    <path d="M 0,{-s/2} C {s/2},{-s/2} {s/2},0 {s/2},{s*0.2} C {s/2},{s/2} {s*0.2},{s/2} {-s*0.1},{s/2} C {-s/2},{s/2} {-s/2},{s*0.2} {-s/2},{-s*0.1} C {-s/2},{-s/2} {-s*0.2},{-s/2} 0,{-s/2} Z" fill={appState.palette[color]} />
  {:else if shape === 1}
    <path d="M {s*0.2},{-s/2} C {s/2},{-s/2} {s/2},{-s*0.2} {s/2},{s*0.1} C {s/2},{s/2} {0},{s/2} {-s*0.1},{s/2} C {-s/5},{s/20} {-s/2},{s*0.1} {-s/2},{-s*0.1} C {-s/2},{-s/2} {-s*0.1},{-s/2} {s*0.2},{-s/2} Z" fill={appState.palette[color]} />
  {:else if shape === 2}
    <path d="M 0,{-s/2} C {s*0.3},{-s*0.2} {s/2},0 {s/2},{s*0.2} C {s/2},{s*0.5} {s*0.2},{s/2} 0,{s/2} C {-s*0.2},{s/2} {-s/2},{s*0.5} {-s/2},{s*0.2} C {-s/2},0 {-s*0.3},{-s*0.2} 0,{-s/2} Z" fill={appState.palette[color]} />
  {:else if shape === 3}
    <path d="M {s*0.1},{-s/2} C {s/2},{-s/2} {s/2},{-s*0.2} {s/2},{s*0.1} C {s/2},{s/2} {s*0.2},{s/2} {-s*0.1},{s/2} C {-s*0.4},{s/2} {-s/2},{s*0.3} {-s/2},{s*0.} C {-s/2},{-s*0.1} {-s*0.1},{-s*0.2} {-s*0.1},{-s*0.3} C {-s*0.1},{-s*0.5} {-s*0.2},{-s/2} {s*0.1},{-s/2} Z" fill={appState.palette[color]} />
  {/if}

{:else}
  {#if shape === 0}
    <circle cx="0" cy="0" r={s / 2} fill={appState.palette[color]} />
  {:else if shape === 1}
    <rect x={-s / 2} y={-s / 2} width={s} height={s} fill={appState.palette[color]} />
  {:else if shape === 2}
    <polygon points="{-s/2},{-s/2} {-s/2},{s/2} {s/2},{s/2}" fill={appState.palette[color]} />
  {:else if shape === 3}
    <polygon points="0,{-s/2} {-s/2},{s/2} {s/2},{s/2}" fill={appState.palette[color]} />
  {/if}
{/if}