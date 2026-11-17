import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: './node_modules/.vite-vitest',
  test: {
    cache: false,
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
  },
});
