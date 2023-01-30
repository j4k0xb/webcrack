import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { assert, beforeEach, describe, expect, test } from 'vitest';
import { transforms } from '../src/transforms';

declare module 'vitest' {
  export interface TestContext {
    expectTransform: (actualCode: string) => Vi.Assertion<Node>;
    state: { changes: number };
  }
}

beforeEach((context, suite) => {
  const transform = transforms.find(t => t.name === suite.name);
  assert(transform, `Transform ${suite.name} not found`);
  context.expectTransform = (actualCode: string) => {
    const ast = parse(actualCode);
    traverse(ast, transform.visitor, undefined, { changes: 0 });
    return expect(ast);
  };
});

describe('sequence', () => {
  test('to statements', ({ expectTransform }) =>
    expectTransform(`
      if (a) b(), c();
    `).toMatchInlineSnapshot(`
      if (a) {
        b();
        c();
      }
    `));

  test('rearrange from return', ({ expectTransform }) =>
    expectTransform(`
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

  test('rearrange from if', ({ expectTransform }) =>
    expectTransform(`
      function f() {
        if (a(), b()) c();
      }
    `).toMatchInlineSnapshot(`
      function f() {
        a();
        if (b()) c();
      }
    `));

  test('rearrange from for-in', ({ expectTransform }) =>
    expectTransform(`
      for (let key in a = 1, object) {}
    `).toMatchInlineSnapshot(`
      a = 1;
      for (let key in object) {}
    `));
});

describe('splitVariableDeclarations', () => {
  test('split variable declaration', ({ expectTransform }) =>
    expectTransform(`
      const a = 1, b = 2, c = 3;
    `).toMatchInlineSnapshot(`
      const a = 1;
      const b = 2;
      const c = 3;
    `));
});

describe('computedProperties', () => {
  test('convert to identifier', ({ expectTransform }) =>
    expectTransform(`
      console["log"]("hello");
    `).toMatchInlineSnapshot('console.log("hello");'));

  test('ignore invalid identifier', ({ expectTransform }) =>
    expectTransform(`
      console["1"]("hello");
    `).toMatchInlineSnapshot('console["1"]("hello");'));
});
