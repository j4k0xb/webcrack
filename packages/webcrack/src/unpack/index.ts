import traverse, { visitors } from '@babel/traverse';
import type * as t from '@babel/types';
import type * as m from '@codemod/matchers';
import debug from 'debug';
import { unpackBrowserify } from './browserify';
import type { Bundle } from './bundle';
import unpackWebpack4 from './webpack/unpack-webpack-4.js';
import unpackWebpack5 from './webpack/unpack-webpack-5.js';
import unpackWebpackChunk from './webpack/unpack-webpack-chunk.js';

export { Bundle } from './bundle';

export function unpackAST(
  ast: t.Node,
  mappings: Record<string, m.Matcher<unknown>> = {},
): Bundle | undefined {
  const options: { bundle: Bundle | undefined } = { bundle: undefined };
  const visitor = visitors.merge([
    unpackWebpack4.visitor(options),
    unpackWebpack5.visitor(options),
    unpackWebpackChunk.visitor(options),
    unpackBrowserify.visitor(options),
  ]);
  traverse(ast, visitor, undefined, { changes: 0 });
  // TODO: applyTransforms(ast, [unpackWebpack, unpackBrowserify]) instead
  if (options.bundle) {
    options.bundle.applyMappings(mappings);
    options.bundle.applyTransforms();
    debug('webcrack:unpack')(
      `Bundle: ${options.bundle.type}, modules: ${options.bundle.modules.size}, entry id: ${options.bundle.entryId}`,
    );
  }
  return options.bundle;
}
