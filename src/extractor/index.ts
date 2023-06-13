import traverse, { visitors } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import debug from 'debug';
import { unpackBrowserify } from './browserify';
import { Bundle } from './bundle';
import { unpackWebpack } from './webpack';

export function unpackBundle(
  ast: t.Node,
  mappings: Record<string, m.Matcher<unknown>> = {}
): Bundle | undefined {
  const options: { bundle: Bundle | undefined } = { bundle: undefined };
  const visitor = visitors.merge([
    unpackWebpack.visitor(options),
    unpackBrowserify.visitor(options),
  ]);
  traverse(ast, visitor, undefined, { changes: 0 });
  if (options.bundle) {
    options.bundle.applyMappings(mappings);
    options.bundle.applyTransforms();
    debug('webcrack:unpack')('Bundle:', options.bundle.type);
  }
  return options.bundle;
}
