import traverse, { Node, TraverseOptions, Visitor, visitors } from '@babel/traverse';

export async function applyTransformAsync<TOptions>(
  ast: Node,
  transform: AsyncTransform<TOptions>,
  options?: TOptions,
): Promise<TransformState> {
  const state: TransformState = { changes: 0 };

  await transform.run?.(ast, state, options);
  if (transform.visitor)
    traverse(ast, transform.visitor(options), undefined, state);

  return state;
}

export function applyTransform<TOptions>(
  ast: Node,
  transform: Transform<TOptions>,
  options?: TOptions,
  noScopeOverride?: boolean,
): TransformState {
  const state: TransformState = { changes: 0 };

  transform.run?.(ast, state, options);

  if (transform.visitor) {
    const visitor = transform.visitor(options) as TraverseOptions<TransformState>;
    visitor.noScope = noScopeOverride || !transform.scope;
    traverse(ast, visitor, undefined, state);
  }

  return state;
}

export function applyTransforms(
  ast: Node,
  transforms: Transform[],
  noScopeOverride?: boolean,
): TransformState {
  const state: TransformState = { changes: 0 };

  for (const transform of transforms) {
    transform.run?.(ast, state);
  }

  const traverseOptions = transforms.flatMap((t) => t.visitor?.() ?? []);
  if (traverseOptions.length > 0) {
    const visitor: TraverseOptions<TransformState> =
      visitors.merge(traverseOptions);
    visitor.noScope = noScopeOverride || transforms.every((t) => !t.scope);
    traverse(ast, visitor, undefined, state);
  }

  return state;
}

export interface TransformState {
  changes: number;
}

export interface Transform<TOptions = unknown> {
  name: string;
  tags: Tag[];
  scope?: boolean;
  run?: (ast: Node, state: TransformState, options?: TOptions) => void;
  visitor?: (options?: TOptions) => Visitor<TransformState>;
}

export interface AsyncTransform<TOptions = unknown>
  extends Transform<TOptions> {
  run?: (ast: Node, state: TransformState, options?: TOptions) => Promise<void>;
}

export type Tag = 'safe' | 'unsafe';
