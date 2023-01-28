import generate from '@babel/generator';
import * as t from '@babel/types';
import { describe, expect, test } from 'vitest';
import computedProperties from '../src/transforms/computedProperties';
import sequence from '../src/transforms/sequence';
import splitVariableDeclarations from '../src/transforms/splitVariableDeclarations';
import { transformer } from './utils';

expect.addSnapshotSerializer({
  serialize: val => generate(val).code,
  test: val => t.isNode(val),
});

describe('sequence', () => {
  const expect = transformer(sequence);
  test('to statements', () =>
    expect(`
      if (a) b(), c();
    `).toMatchInlineSnapshot(`
      if (a) {
        b();
        c();
      }
    `));

  test('rearrange from return', () =>
    expect(`
      function f() {
        return a(), b(), c();
      }
    `).toMatchInlineSnapshot(`
      function f() {
        a();
        b();
        return c();
      }
    `));

  test('rearrange from if', () =>
    expect(`
      function f() {
        if (a(), b()) c();
      }
    `).toMatchInlineSnapshot(`
      function f() {
        a();
        if (b()) c();
      }
    `));

  test('rearrange from for-in', () =>
    expect(`
      for (let key in a = 1, object) {}
    `).toMatchInlineSnapshot(`
      a = 1;
      for (let key in object) {}
    `));
});

describe('splitVariableDeclarations', () => {
  const expect = transformer(splitVariableDeclarations);
  test('split variable declaration', () =>
    expect(`
      const a = 1, b = 2, c = 3;
    `).toMatchInlineSnapshot(`
      const a = 1;
      const b = 2;
      const c = 3;
    `));
});

describe('computedProperties', () => {
  const expect = transformer(computedProperties);
  test('convert to identifier', () =>
    expect(`
      console["log"]("hello");
    `).toMatchInlineSnapshot('console.log("hello");'));

  test('ignore invalid identifier', () =>
    expect(`
      console["1"]("hello");
    `).toMatchInlineSnapshot('console["1"]("hello");'));
});
