import traverse, { Node, TraverseOptions } from '@babel/traverse';
import blockStatement from './blockStatement';
import booleanIf from './booleanIf';
import computedProperties from './computedProperties';
import deterministicIf from './deterministicIf';
import extractTernaryCalls from './extractTernaryCalls';
import numberExpressions from './numberExpressions';
import rawLiterals from './rawLiterals';
import sequence from './sequence';
import splitVariableDeclarations from './splitVariableDeclarations';
import unminifyBooleans from './unminifyBooleans';

export const transforms: Transform<any>[] = [
  rawLiterals,
  blockStatement,
  computedProperties,
  sequence,
  splitVariableDeclarations,
  extractTernaryCalls,
  numberExpressions,
  unminifyBooleans,
  booleanIf,
  deterministicIf,
];

export function applyTransforms(ast: Node, tags: Tag[]) {
  transforms
    .filter(t => tags.some(x => t.tags.includes(x)))
    .forEach(transform => {
      applyTransform(ast, transform);
    });
}

export function applyTransform<TOptions>(
  ast: Node,
  transform: Transform<TOptions>,
  options?: TOptions
) {
  const start = performance.now();
  console.log(`${transform.name}: started`);

  transform.preTransforms?.forEach(preTransform => {
    applyTransform(ast, preTransform);
  });

  const state = { changes: 0 };
  transform.run?.(ast, state, options);
  if (transform.visitor)
    traverse(ast, transform.visitor(options), undefined, state);

  transform.postTransforms?.forEach(postTransform => {
    applyTransform(ast, postTransform);
  });

  console.log(
    `${transform.name}: finished in ${Math.floor(
      performance.now() - start
    )} ms with ${state.changes} changes`
  );
}

export interface Transform<TOptions = any> {
  name: string;
  tags: Tag[];
  preTransforms?: Transform[];
  postTransforms?: Transform[];
  run?: (ast: Node, state: { changes: number }, options?: TOptions) => void;
  visitor?: (options?: TOptions) => TraverseOptions<{ changes: number }>;
}

export type Tag = 'safe' | 'unsafe' | 'readability';
