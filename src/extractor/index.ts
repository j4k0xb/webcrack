import traverse, { Visitor, visitors } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import debug from 'debug';
import { TransformState } from '../transforms';
import { unpackBrowserify } from './browserify';
import { Bundle } from './bundle';
import { unpackParcel } from './parcel';
import { unpackWebpack } from './webpack';

export function unpackBundle(
  ast: t.Node,
  mappings: Record<string, m.Matcher<unknown>> = {}
): Bundle | undefined {
  const options: { bundle: Bundle | undefined } = { bundle: undefined };
  const traverseOptions: Visitor<TransformState>[] = [
    unpackWebpack.visitor(options),
    unpackBrowserify.visitor(options),
    unpackParcel.visitor(options),
  ];
  const visitor = visitors.merge(traverseOptions);
  // @ts-expect-error regression from https://github.com/babel/babel/pull/15702
  visitor.noScope = traverseOptions.every(v => v.noScope);
  traverse(ast, visitor, undefined, { changes: 0 });
  if (options.bundle) {
    options.bundle.applyMappings(mappings);
    options.bundle.applyTransforms();
    debug('webcrack:unpack')('Bundle:', options.bundle.type);
  }
  return options.bundle;
}
