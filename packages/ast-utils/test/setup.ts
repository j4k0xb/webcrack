import * as t from '@babel/types';
import { expect } from 'vitest';
import { generate } from '../src/generator';

expect.addSnapshotSerializer({
  test: (val: unknown) => t.isNode(val) && !('parentPath' in val),
  serialize: (val: t.Node) => generate(val),
});
