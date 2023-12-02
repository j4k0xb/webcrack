import { join } from 'node:path';
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    root: join(__dirname, 'test'),
    setupFiles: 'setup.ts',
    include: ['**/*.test.ts'],
    isolate: false,
  },
});
