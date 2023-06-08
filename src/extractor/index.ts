import traverse, { visitors } from '@babel/traverse';
import * as t from '@babel/types';
import { unpackBrowserify } from './browserify';
import { Bundle } from './bundle';
import { unpackWebpack } from './webpack';

export function unpackBundle(ast: t.Node): Bundle | undefined {
  const options: { bundle: Bundle | undefined } = { bundle: undefined };
  const visitor = visitors.merge([
    unpackWebpack.visitor(options),
    unpackBrowserify.visitor(options),
  ]);
  traverse(ast, visitor, undefined, { changes: 0 });
  return options.bundle;
}
