import generate from '@babel/generator';
import * as t from '@babel/types';
import { expect } from 'vitest';

expect.addSnapshotSerializer({
  test: (val: unknown) => t.isNode(val) && !('parentPath' in val),
  serialize: (val: t.Node) => generate(val).code,
});
