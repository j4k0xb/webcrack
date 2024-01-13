import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { expect } from 'vitest';
import { generate } from '../src/ast-utils';

expect.addSnapshotSerializer({
  test: (val: unknown) => t.isNode(val) && !('parentPath' in val),
  serialize: (val: t.Node) => generate(val),
});

expect.addSnapshotSerializer({
  test: (val: unknown) => t.isNode(val) && 'parentPath' in val,
  serialize: (val: NodePath) => `NodePath<${val.type}>`,
});
