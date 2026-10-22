<script>
  import { onMount } from 'svelte';
  import { initLocalFonts } from '$lib/fontManager.js';
  import MainWindow from "$components/MainWindow.svelte";

  const root = document.querySelector(':root');
  root.classList.add("sl-theme-dark");

  let fontsLoaded = $state(false);

  onMount(async () => {
    await initLocalFonts();
    fontsLoaded = true;
  });
</script>

<div class="window-container">
  <MainWindow />
</div>