import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    forceRerunTriggers: ['**/samples/**'],
    setupFiles: 'test/setup.ts',
    threads: false, // https://github.com/laverdet/isolated-vm/issues/138
  },
});
