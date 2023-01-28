import generate from '@babel/generator';
import * as t from '@babel/types';
import { expect } from 'vitest';

expect.addSnapshotSerializer({
  test: val => t.isNode(val),
  serialize: val => generate(val).code,
});
