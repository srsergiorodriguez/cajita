import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: './',
  plugins: [svelte()],
  server: {
    port: 5173
  },
  build: {
    target: 'es2022',
    // The editor shell is intentionally one chunk; larger feature dialogs are lazy-loaded.
    chunkSizeWarningLimit: 550
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
});
