import traverse, { Node, TraverseOptions } from '@babel/traverse';
import debug from 'debug';
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

const logger = debug('webcrack:transforms');

export type TransformName = keyof typeof transforms;

export type TransformOptions<TName extends TransformName> =
  (typeof transforms)[TName] extends Transform<infer TOptions>
    ? TOptions
    : never;

export async function applyTransformAsync<TOptions>(
  ast: Node,
  transform: AsyncTransform<TOptions>,
  options?: TOptions
): Promise<TransformState> {
  logger(`${transform.name}: started`);

  const state: TransformState = { changes: 0 };

  await transform.run?.(ast, state, options);
  if (transform.visitor)
    traverse(ast, transform.visitor(options), undefined, state);

  logger(`${transform.name}: finished with ${state.changes} changes`);

  return state;
}

export function applyTransform<TOptions>(
  ast: Node,
  transform: Transform<TOptions>,
  options?: TOptions
): TransformState {
  logger(`${transform.name}: started`);

  const state: TransformState = { changes: 0 };

  transform.run?.(ast, state, options);
  if (transform.visitor)
    traverse(ast, transform.visitor(options), undefined, state);

  logger(`${transform.name}: finished with ${state.changes} changes`);

  return state;
}

export interface TransformState {
  changes: number;
}

export interface Transform<TOptions = unknown> {
  name: string;
  tags: Tag[];
  run?: (ast: Node, state: TransformState, options?: TOptions) => void;
  visitor?: (options?: TOptions) => TraverseOptions<TransformState>;
}

export interface AsyncTransform<TOptions = unknown>
  extends Transform<TOptions> {
  run?: (ast: Node, state: TransformState, options?: TOptions) => Promise<void>;
}

export type Tag = 'safe' | 'unsafe';
