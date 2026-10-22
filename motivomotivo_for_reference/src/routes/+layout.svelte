<script>
  import '../global.css';
  import '@shoelace-style/shoelace/dist/themes/dark.css';
  // import '@shoelace-style/shoelace/dist/themes/light.css';
  import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
  setBasePath('./');
</script>

<slot></slot>

<style>
  :global(:root){
    --sl-font-sans: var(--main-font);
    --sl-color-neutral-0: var(--main-bg);
    --sl-color-neutral-50: var(--main-bg-50);
    --sl-color-neutral-100: var(--main-bg-100);
    /* --sl-color-primary-50: #e3f9e5;
    --sl-color-primary-100: #c1eac5;
    --sl-color-primary-200: #a3d9a5;
    --sl-color-primary-300: #7bc47f;
    --sl-color-primary-400: #57ae5b;
    --sl-color-primary-500: #3f9142;
    --sl-color-primary-600: #2f8132;
    --sl-color-primary-700: #207227;
    --sl-color-primary-800: #0e5814;
    --sl-color-primary-900: #05400a; */
  }

  /* :global(sl-menu-item) { */
    /* background-color: red; */
    /* font-size: var(--sl-font-size-medium); */
    /* font-size: 2px !important; */
  /* } */
</style>