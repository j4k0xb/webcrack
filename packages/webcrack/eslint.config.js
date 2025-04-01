import config from '@webcrack/eslint-config';

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  ...config,
  {
    ignores: ['tmp', '**/test/samples'],
  },
];
