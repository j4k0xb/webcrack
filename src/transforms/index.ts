import traverse, { Node, TraverseOptions } from '@babel/traverse';
import blockStatement from './blockStatement';
import booleanIf from './booleanIf';
import computedProperties from './computedProperties';
import deterministicIf from './deterministicIf';
import jsx from './jsx';
import mergeElseIf from './mergeElseIf';
import mergeStrings from './mergeStrings';
import numberExpressions from './numberExpressions';
import rawLiterals from './rawLiterals';
import sequence from './sequence';
import splitVariableDeclarations from './splitVariableDeclarations';
import ternaryToIf from './ternaryToIf';
import unminify from './unminify';
import unminifyBooleans from './unminifyBooleans';
import void0ToUndefined from './void0ToUndefined';
import yoda from './yoda';

export const transforms = {
  unminify,
  rawLiterals,
  blockStatement,
  mergeElseIf,
  mergeStrings,
  computedProperties,
  splitVariableDeclarations,
  sequence,
  numberExpressions,
  unminifyBooleans,
  booleanIf,
  ternaryToIf,
  deterministicIf,
  void0ToUndefined,
  yoda,
  jsx,
};

export type TransformName = keyof typeof transforms;

export type TransformOptions<TName extends TransformName> =
  (typeof transforms)[TName] extends Transform<infer TOptions>
    ? TOptions
    : never;

export function applyTransform<TOptions>(
  ast: Node,
  transform: Transform<TOptions>,
  options?: TOptions
): TransformState {
  const start = performance.now();
  console.log(`${transform.name}: started`);

  const state: TransformState = { changes: 0 };

  transform.preTransforms?.forEach(preTransform => {
    state.changes += applyTransform(ast, preTransform).changes;
  });

  transform.run?.(ast, state, options);
  if (transform.visitor)
    traverse(ast, transform.visitor(options), undefined, state);

  transform.postTransforms?.forEach(postTransform => {
    state.changes += applyTransform(ast, postTransform).changes;
  });

  console.log(
    `${transform.name}: finished in`,
    Math.floor(performance.now() - start),
    'ms with',
    state.changes,
    'changes'
  );

  return state;
}

export interface TransformState {
  changes: number;
}

export interface Transform<TOptions = unknown> {
  name: string;
  tags: Tag[];
  preTransforms?: Transform[];
  postTransforms?: Transform[];
  run?: (ast: Node, state: TransformState, options?: TOptions) => void;
  visitor?: (options?: TOptions) => TraverseOptions<TransformState>;
}

export type Tag = 'safe' | 'unsafe';
