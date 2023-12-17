import { join } from 'node:path';
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    setupFiles: join(__dirname, 'test', 'setup.ts'),
    include: ['**/*.test.ts'],
    isolate: false,
  },
});
