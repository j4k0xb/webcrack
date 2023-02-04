import { parse } from '@babel/parser';
import { assert, beforeEach, describe, expect, test } from 'vitest';
import { transforms } from '../src/transforms';
import { applyTransform } from '../src/transforms/index';

declare module 'vitest' {
  export interface TestContext {
    expectTransform: (actualCode: string, options?: any) => Vi.Assertion<Node>;
    state: { changes: number };
  }
}

beforeEach((context, suite) => {
  const transform = transforms.find(t => t.name === suite.name);
  assert(transform, `Transform ${suite.name} not found`);
  // TODO: type options
  context.expectTransform = (actualCode, options) => {
    const ast = parse(actualCode);
    applyTransform(ast, transform, options);
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
      if (a(), b()) c();
    `).toMatchInlineSnapshot(`
      a();
      if (b()) c();
    `));

  test('rearrange from switch', ({ expectTransform }) =>
    expectTransform(`
      switch (a(), b()) {}
    `).toMatchInlineSnapshot(`
      a();
      switch (b()) {}
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

  test('dont split in for loop', ({ expectTransform }) =>
    expectTransform(`
      for (let i = 0, j = 1; i < 10; i++, j++) var a, b;
    `).toMatchInlineSnapshot(`
      for (let i = 0, j = 1; i < 10; i++, j++) {
        var a;
        var b;
      }
    `));
});

describe('computedProperties', () => {
  test('convert to identifier', ({ expectTransform }) => {
    expectTransform(`
      console["log"]("hello");
    `).toMatchInlineSnapshot('console.log("hello");');
    expectTransform(`
      require("foo")["default"];
    `).toMatchInlineSnapshot('require("foo").default;');
    expectTransform(`
      const x = { ["foo"](){} };
      const y = { ["foo"]: 1 };
    `).toMatchInlineSnapshot(`
      const x = {
        foo() {}
      };
      const y = {
        foo: 1
      };
    `);
  });

  test('ignore invalid identifier', ({ expectTransform }) =>
    expectTransform(`
      console["1"]("hello");
    `).toMatchInlineSnapshot('console["1"]("hello");'));
});

describe('extractTernaryCalls', () => {
  test('extract all', ({ expectTransform }) =>
    expectTransform(`
      __DECODE__(100 < o ? 10753 : 5 < o ? 2382 : 2820);
      log(p ? 8590 : 5814);
    `).toMatchInlineSnapshot(
      `
      100 < o ? __DECODE__(10753) : 5 < o ? __DECODE__(2382) : __DECODE__(2820);
      p ? log(8590) : log(5814);
    `
    ));

  test('extract with filter', ({ expectTransform }) =>
    expectTransform(
      `
    __DECODE__(100 < o ? 10753 : 5 < o ? 2382 : 2820);
    log(p ? 8590 : 5814);
    `,
      { callee: '__DECODE__' }
    ).toMatchInlineSnapshot(`
      100 < o ? __DECODE__(10753) : 5 < o ? __DECODE__(2382) : __DECODE__(2820);
      log(p ? 8590 : 5814);
    `));
});

describe('rawLiterals', () => {
  test('string', ({ expectTransform }) =>
    expectTransform(`const a = "\\x61"`).toMatchInlineSnapshot(
      'const a = "a";'
    ));

  test('number', ({ expectTransform }) =>
    expectTransform(`const a = 0x1;`).toMatchInlineSnapshot('const a = 1;'));
});

describe('blockStatement', () => {
  test('convert to block statement', ({ expectTransform }) =>
    expectTransform(`
      if (a) b();
      while (a) b();
      for (;;) b();
      for (const key in object) b();
      for (const item of array) b();
    `).toMatchInlineSnapshot(`
      if (a) {
        b();
      }
      while (a) {
        b();
      }
      for (;;) {
        b();
      }
      for (const key in object) {
        b();
      }
      for (const item of array) {
        b();
      }
    `));
});

describe('numberExpressions', () => {
  test('simplify', ({ expectTransform }) =>
    expectTransform(`
      console.log(-0x1021e + -0x7eac8 + 0x17 * 0xac9c);
    `).toMatchInlineSnapshot('console.log(431390);'));

  test('ignore other node types', ({ expectTransform }) =>
    expectTransform(`
      console.log(0x1021e + "test");
    `).toMatchInlineSnapshot('console.log(0x1021e + "test");'));
});

describe('unminifyBooleans', () => {
  test('true', ({ expectTransform }) => {
    expectTransform('!0').toMatchInlineSnapshot('true;');
    expectTransform('!!1').toMatchInlineSnapshot('true;');
    expectTransform('!![]').toMatchInlineSnapshot('true;');
  });

  test('false', ({ expectTransform }) => {
    expectTransform('!1').toMatchInlineSnapshot('false;');
    expectTransform('![]').toMatchInlineSnapshot('false;');
  });
});

describe('booleanIf', () => {
  test('and', ({ expectTransform }) =>
    expectTransform(`
      x && y && z();
    `).toMatchInlineSnapshot(`
      if (x && y) {
        z();
      }
    `));

  test('or', ({ expectTransform }) =>
    expectTransform(`
      x || y || z();
    `).toMatchInlineSnapshot(`
      if (!(x || y)) {
        z();
      }
    `));
});

describe('deterministicIf', () => {
  test('always true', ({ expectTransform }) => {
    expectTransform(`
      if ("xyz" === "xyz") {
        a();
      } else {
        b();
      }
  `).toMatchInlineSnapshot('a();');
    expectTransform(`
      if ("xyz" !== "abc") {
        a();
      } else {
        b();
      }
  `).toMatchInlineSnapshot('a();');
  });

  test('always false', ({ expectTransform }) => {
    expectTransform(`
      if ("abc" === "xyz") {
        a();
      } else {
        b();
      }
  `).toMatchInlineSnapshot('b();');

    expectTransform(`
      if ("abc" !== "abc") {
        a();
      } else {
        b();
      }
  `).toMatchInlineSnapshot('b();');
  });
});

describe('ternaryToIf', () => {
  test('statement', ({ expectTransform }) =>
    expectTransform(`
      a ? b() : c();
    `).toMatchInlineSnapshot(`
      if (a) {
        b();
      } else {
        c();
      }
    `));

  test('ignore expression', ({ expectTransform }) =>
    expectTransform(`
      const x = a ? b() : c();
    `).toMatchInlineSnapshot('const x = a ? b() : c();'));
});

describe('mergeStrings', () => {
  test('multiple', ({ expectTransform }) =>
    expectTransform(`
      console.log("a" + "b" + "c");
    `).toMatchInlineSnapshot('console.log("abc");'));
});
