import { join } from 'node:path';
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    root: join(__dirname, 'test'),
    setupFiles: 'setup.ts',
    include: ['**/*.test.ts'],
    isolate: false,
    // isolated-vm "Module did not self-register" error workaround
    // https://github.com/vitest-dev/vitest/issues/740#issuecomment-1042648373
    threads: false,
  },
});
