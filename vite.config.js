import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: './',
  plugins: [svelte()],
  server: {
    port: 5173
  },
  build: {
    target: 'es2022'
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
});
