import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '~': fileURLToPath(new URL('src', import.meta.url)) },
  },
  server: { port: 8000, strictPort: true },
  preview: { port: 8000, strictPort: true },
  build: { target: 'es2022', license: true },
  test: { include: ['tests/**/*.test.ts'] },
});
