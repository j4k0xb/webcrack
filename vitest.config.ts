import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    forceRerunTriggers: ['test/samples/**'],
    setupFiles: 'test/setup.ts',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
    },
    threads: false, // https://github.com/laverdet/isolated-vm/issues/138
  },
});
