import traverse, { Node, TraverseOptions } from '@babel/traverse';
import blockStatement from './blockStatement';
import booleanIf from './booleanIf';
import computedProperties from './computedProperties';
import deterministicIf from './deterministicIf';
import mergeElseIf from './mergeElseIf';
import mergeStrings from './mergeStrings';
import numberExpressions from './numberExpressions';
import rawLiterals from './rawLiterals';
import sequence from './sequence';
import splitVariableDeclarations from './splitVariableDeclarations';
import ternaryToIf from './ternaryToIf';
import unminifyBooleans from './unminifyBooleans';

export const transforms = {
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
};

export type TransformName = keyof typeof transforms;

export type TransformOptions<TName extends TransformName> =
  typeof transforms[TName] extends Transform<infer TOptions> ? TOptions : never;

export function resetRunState() {
  Object.values(transforms as Record<string, Transform>).forEach(
    transform => (transform.hasRun = false)
  );
}

export function applyTransforms(ast: Node, tags: Tag[]): { changes: number } {
  const state = { changes: 0 };
  Object.values(transforms as Record<string, Transform>)
    .filter(transform => tags.some(tag => transform.tags.includes(tag)))
    .forEach(transform => {
      if (transform.hasRun && transform.tags.includes('once')) return;
      state.changes += applyTransform(ast, transform).changes;
      transform.hasRun = true;
    });
  return state;
}

export function applyTransform<TOptions>(
  ast: Node,
  transform: Transform<TOptions>,
  options?: TOptions
): { changes: number } {
  const start = performance.now();
  console.log(`${transform.name}: started`);

  const state = { changes: 0 };

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

export interface Transform<TOptions = unknown> {
  name: string;
  tags: Tag[];
  preTransforms?: Transform[];
  postTransforms?: Transform[];
  hasRun?: boolean;
  run?: (ast: Node, state: { changes: number }, options?: TOptions) => void;
  visitor?: (options?: TOptions) => TraverseOptions<{ changes: number }>;
}

export type Tag = 'safe' | 'unsafe' | 'readability' | 'once';
