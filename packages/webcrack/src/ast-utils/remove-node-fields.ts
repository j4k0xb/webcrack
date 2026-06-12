import * as t from '@babel/types';

// Adapted https://github.com/babel/babel/blob/2688fbd1999f5be276142ad0cf60ef182e60fb65/packages/babel-types/src/traverse/traverseFast.ts
export function removeNodeFields(node: t.Node) {
  if (!node) return;

  node.loc = undefined;
  node.extra = undefined;

  const keys = t.VISITOR_KEYS[node.type];
  if (!keys) return;

  for (const key of keys) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const subNode: t.Node | t.Node[] | undefined | null =
      // @ts-expect-error key must present in node
      node[key];
    if (!subNode) continue;

    if (Array.isArray(subNode)) {
      for (const node of subNode) {
        removeNodeFields(node);
      }
    } else {
      removeNodeFields(subNode);
    }
  }
}
