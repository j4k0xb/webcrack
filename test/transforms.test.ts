import { parse } from '@babel/parser';
import { describe as describeVitest, expect, test } from 'vitest';
import { transforms } from '../src/transforms';
import {
  applyTransform,
  TransformName,
  TransformOptions,
} from '../src/transforms/index';

function describe<TName extends TransformName>(
  name: TName,
  factory: (
    expect: (
      actualCode: string,
      options?: TransformOptions<TName>
    ) => Vi.Assertion<Node>
  ) => void
) {
  return describeVitest(name, () => {
    factory((actualCode, options) => {
      const ast = parse(actualCode);
      applyTransform(ast, transforms[name], options as any);
      return expect(ast);
    });
  });
}

describe('sequence', expectJS => {
  test('to statements', () =>
    expectJS(`
      if (a) b(), c();
    `).toMatchInlineSnapshot(`
      if (a) {
        b();
        c();
      }
    `));

  test('rearrange from return', () =>
    expectJS(`
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
    expectJS(`
      if (a(), b()) c();
    `).toMatchInlineSnapshot(`
      a();
      if (b()) c();
    `));

  test('rearrange from switch', () =>
    expectJS(`
      switch (a(), b()) {}
    `).toMatchInlineSnapshot(`
      a();
      switch (b()) {}
    `));

  test('rearrange from for-in', () =>
    expectJS(`
      for (let key in a = 1, object) {}
    `).toMatchInlineSnapshot(`
      a = 1;
      for (let key in object) {}
    `));
});

describe('splitVariableDeclarations', expectJS => {
  test('split variable declaration', () =>
    expectJS(`
      const a = 1, b = 2, c = 3;
    `).toMatchInlineSnapshot(`
      const a = 1;
      const b = 2;
      const c = 3;
    `));

  test('dont split in for loop', () =>
    expectJS(`
      for (let i = 0, j = 1; i < 10; i++, j++) var a, b;
    `).toMatchInlineSnapshot(`
      for (let i = 0, j = 1; i < 10; i++, j++) {
        var a;
        var b;
      }
    `));
});

describe('computedProperties', expectJS => {
  test('member expression', () => {
    expectJS(`
      require("foo")["default"]?.["bar"];
    `).toMatchInlineSnapshot('require("foo").default?.bar;');
  });

  test('object', () => {
    expectJS(`
      const x = { ["foo"](){}, ["bar"]: 1 };
    `).toMatchInlineSnapshot(`
      const x = {
        foo() {},
        bar: 1
      };
    `);
  });

  test('class', () => {
    expectJS(`
      class Foo {
        ["foo"](){}
        ["bar"] = 1;
      }
    `).toMatchInlineSnapshot(`
      class Foo {
        foo() {}
        bar = 1;
      }
    `);
  });

  test('ignore invalid identifier', () =>
    expectJS(`
      console["1"]("hello");
    `).toMatchInlineSnapshot('console["1"]("hello");'));
});

describe('extractTernaryCalls', expectJS => {
  test('extract all', () =>
    expectJS(`
      __DECODE__(100 < o ? 10753 : 5 < o ? 2382 : 2820);
      log(p ? 8590 : 5814);
    `).toMatchInlineSnapshot(
      `
      100 < o ? __DECODE__(10753) : 5 < o ? __DECODE__(2382) : __DECODE__(2820);
      p ? log(8590) : log(5814);
    `
    ));

  test('extract with filter', () =>
    expectJS(
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

describe('rawLiterals', expectJS => {
  test('string', () =>
    expectJS(`const a = "\\x61"`).toMatchInlineSnapshot('const a = "a";'));

  test('number', () =>
    expectJS(`const a = 0x1;`).toMatchInlineSnapshot('const a = 1;'));
});

describe('blockStatement', expectJS => {
  test('convert to block statement', () =>
    expectJS(`
      if (a) b();
      while (a) b();
      for (;;) b();
      for (const key in object) b();
      for (const item of array) b();
      const x = () => (a(), b());
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
      const x = () => {
        return a(), b();
      };
    `));
});

describe('numberExpressions', expectJS => {
  test('simplify', () =>
    expectJS(`
      console.log(-0x1021e + -0x7eac8 + 0x17 * 0xac9c);
    `).toMatchInlineSnapshot('console.log(431390);'));

  test('ignore other node types', () =>
    expectJS(`
      console.log(0x1021e + "test");
    `).toMatchInlineSnapshot('console.log(0x1021e + "test");'));
});

describe('unminifyBooleans', expectJS => {
  test('true', () => {
    expectJS('!0').toMatchInlineSnapshot('true;');
    expectJS('!!1').toMatchInlineSnapshot('true;');
    expectJS('!![]').toMatchInlineSnapshot('true;');
  });

  test('false', () => {
    expectJS('!1').toMatchInlineSnapshot('false;');
    expectJS('![]').toMatchInlineSnapshot('false;');
  });
});

describe('booleanIf', expectJS => {
  test('and', () =>
    expectJS(`
      x && y && z();
    `).toMatchInlineSnapshot(`
      if (x && y) {
        z();
      }
    `));

  test('or', () =>
    expectJS(`
      x || y || z();
    `).toMatchInlineSnapshot(`
      if (!(x || y)) {
        z();
      }
    `));
});

describe('deterministicIf', expectJS => {
  test('always true', () => {
    expectJS(`
      if ("xyz" === "xyz") {
        a();
      } else {
        b();
      }
   `).toMatchInlineSnapshot('a();');
    expectJS(`
      if ("xyz" !== "abc") {
        a();
      } else {
        b();
      }
   `).toMatchInlineSnapshot('a();');

    expectJS(`
      "xyz" === "xyz" ? a() : b();
    `).toMatchInlineSnapshot('a();');
    expectJS(`
      "xyz" !== "abc" ? a() : b();
    `).toMatchInlineSnapshot('a();');
  });

  test('always false', () => {
    expectJS(`
      if ("abc" === "xyz") {
        a();
      } else {
        b();
      }
   `).toMatchInlineSnapshot('b();');
    expectJS(`
      if ("abc" !== "abc") {
        a();
      } else {
        b();
      }
    `).toMatchInlineSnapshot('b();');

    expectJS(`
      "abc" === "xyz" ? a() : b();
    `).toMatchInlineSnapshot('b();');
    expectJS(`
      "abc" !== "abc" ? a() : b();
    `).toMatchInlineSnapshot('b();');
  });
});

describe('ternaryToIf', expectJS => {
  test('statement', () =>
    expectJS(`
      a ? b() : c();
    `).toMatchInlineSnapshot(`
      if (a) {
        b();
      } else {
        c();
      }
    `));

  test('ignore expression', () =>
    expectJS(`
      const x = a ? b() : c();
    `).toMatchInlineSnapshot('const x = a ? b() : c();'));
});

describe('mergeStrings', expectJS => {
  test('only strings', () =>
    expectJS(`
      "a" + "b" + "c";
    `).toMatchInlineSnapshot('"abc";'));
  test('with variables', () =>
    expectJS(`
      "a" + "b" + xyz + "c" + "d";
    `).toMatchInlineSnapshot('"ab" + xyz + "cd";'));
});
