import traverse, { Node, TraverseOptions, visitors } from '@babel/traverse';
import debug from 'debug';

const logger = debug('webcrack:transforms');

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

export function applyTransforms(
  ast: Node,
  transforms: Transform[],
  name?: string
): TransformState {
  name ??= transforms.map(t => t.name).join(', ');
  logger(`${name}: started`);

  const state: TransformState = { changes: 0 };

  for (const transform of transforms) {
    transform.run?.(ast, state);
  }

  const traverseOptions = transforms.flatMap(t => t.visitor?.() ?? []);
  if (traverseOptions.length > 0) {
    const visitor = visitors.merge(traverseOptions);
    traverse(ast, visitor, undefined, state);
  }

  logger(`${name}: finished with ${state.changes} changes`);

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
