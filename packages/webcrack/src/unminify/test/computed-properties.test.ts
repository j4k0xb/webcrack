import { test } from 'vitest';
import { testTransform } from '../../../test';
import { computedProperties } from '../transforms';

const expectJS = testTransform(computedProperties);

test('member expression', () => {
  expectJS(`
    require("foo")["default"]?.["_"];
  `).toMatchInlineSnapshot('require("foo").default?._;');
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

test('ignore __proto__ property', () =>
  expectJS(`
    const x = { ["__proto__"]: 1 };
  `).toMatchInlineSnapshot(`
    const x = {
      ["__proto__"]: 1
    };
  `));

test('ignore constructor method', () =>
  expectJS(`
    class Foo {
      ["constructor"](){}
    }
  `).toMatchInlineSnapshot(`
    class Foo {
      ["constructor"]() {}
    }
  `));
