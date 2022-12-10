import * as t from '@babel/types';

export type BundlerType = 'webpack';

export function detectBundler(ast: t.File): BundlerType | undefined {
  return 'webpack';
}
