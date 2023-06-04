import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    forceRerunTriggers: ['**/samples/**'],
    setupFiles: 'test/setup.ts',
  },
});
