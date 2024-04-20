import config from '@webcrack/eslint-config';

/**
 * @type {import('eslint').Linter.FlatConfig[]}
 */
export default [
  ...config,
  {
    ignores: ['tmp', '**/test/samples', 'vitest.config.ts'],
  },
];
