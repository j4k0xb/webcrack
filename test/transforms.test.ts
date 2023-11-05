import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { Assertion, describe as describeVitest, expect, test } from 'vitest';
import { webcrack } from '../src';
import deadCode from '../src/deobfuscator/deadCode';
import inlineObjectProps from '../src/deobfuscator/inlineObjectProps';
import mergeObjectAssignments from '../src/deobfuscator/mergeObjectAssignments';
import { Transform } from '../src/transforms';
import blockStatement from '../src/transforms/blockStatement';
import booleanIf from '../src/transforms/booleanIf';
import computedProperties from '../src/transforms/computedProperties';
import { applyTransform } from '../src/transforms/index';
import jsonParse from '../src/transforms/jsonParse';
import jsx from '../src/transforms/jsx';
import jsxNew from '../src/transforms/jsx-new';
import mergeElseIf from '../src/transforms/mergeElseIf';
import mergeStrings from '../src/transforms/mergeStrings';
import numberExpressions from '../src/transforms/numberExpressions';
import rawLiterals from '../src/transforms/rawLiterals';
import sequence from '../src/transforms/sequence';
import splitVariableDeclarations from '../src/transforms/splitVariableDeclarations';
import ternaryToIf from '../src/transforms/ternaryToIf';
import unminify from '../src/transforms/unminify';
import unminifyBooleans from '../src/transforms/unminifyBooleans';
import void0ToUndefined from '../src/transforms/void0ToUndefined';
import yoda from '../src/transforms/yoda';

function describe<Options>(
  transform: Transform<Options>,
  factory: (
    expect: (actualCode: string, options?: Options) => Assertion<Node>
  ) => void
) {
  return describeVitest(transform.name, () => {
    factory((actualCode, options) => {
      const ast = parse(actualCode, {
        sourceType: 'unambiguous',
        allowReturnOutsideFunction: true,
      });
      traverse(ast); // to crawl scope and get bindings
      applyTransform(ast, transform, options);
      return expect(ast);
    });
  });
}

test('decode bookmarklet', async () => {
  const code = `javascript:(function()%7Balert('hello%20world')%3B%7D)()%3B`;
  const result = await webcrack(code);
  expect(result.code).toMatchInlineSnapshot(`
    "(function () {
      alert(\\"hello world\\");
    })();"
  `);
});

describe(sequence, expectJS => {
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

  test('return void', () =>
    expectJS(`
      return void (a(), b());
    `).toMatchInlineSnapshot(`
      a();
      b();
      return;
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

  test('throw', () =>
    expectJS(`
      throw a(), b();
    `).toMatchInlineSnapshot(`
      a();
      throw b();
    `));

  test('rearrange from for-in', () =>
    expectJS(`
      for (let key in a = 1, object) {}
    `).toMatchInlineSnapshot(`
      a = 1;
      for (let key in object) {}
    `));

  test('rearrange from for loop init', () =>
    expectJS(`
      for((a(), b());;);
    `).toMatchInlineSnapshot(`
      a();
      b();
      for (;;);
    `));

  test('rearrange from for loop update', () =>
    expectJS(`
      for(; i < 10; a(), b(), i++);
    `).toMatchInlineSnapshot(`
      for (; i < 10; i++) {
        a();
        b();
      }
    `));

  test('rearrange variable declarator', () =>
    expectJS(`
    var t = (o = null, o);
    `).toMatchInlineSnapshot(`
      o = null;
      var t = o;
    `));

  test('dont rearrange variable declarator in for loop', () =>
    expectJS(`
      for(let a = (b, c);;) {}
    `).toMatchInlineSnapshot(`
      b;
      for (let a = c;;) {}
    `));
});

describe(splitVariableDeclarations, expectJS => {
  test('split variable declaration', () =>
    expectJS(`
      const a = 1, b = 2, c = 3;
    `).toMatchInlineSnapshot(`
      const a = 1;
      const b = 2;
      const c = 3;
    `));

  test('split exported variable declaration', () =>
    expectJS(`
      export const a = 1, b = 2, c = 3;
    `).toMatchInlineSnapshot(`
      export const a = 1;
      export const b = 2;
      export const c = 3;
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

describe(computedProperties, expectJS => {
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
});

describe(rawLiterals, expectJS => {
  test('string', () =>
    expectJS(
      String.raw`f("\x61", '"', "\u270F\uFE0F", "\u2028\u2029\t")`
    ).toMatchInlineSnapshot('f("a", "\\"", "✏️", "\\u2028\\u2029\\t");'));

  test('number', () =>
    expectJS('const a = 0x1;').toMatchInlineSnapshot('const a = 1;'));
});

describe(blockStatement, expectJS => {
  test('if statement', () =>
    expectJS(`
      if (a) b();
    `).toMatchInlineSnapshot(`
      if (a) {
        b();
      }
    `));

  test('while statement', () =>
    expectJS(`
      while (a) b();
    `).toMatchInlineSnapshot(`
      while (a) {
        b();
      }
    `));

  test('for statement', () =>
    expectJS(`
      for (;;) b();
    `).toMatchInlineSnapshot(`
      for (;;) {
        b();
      }
    `));

  test('for in statement', () =>
    expectJS(`
      for (const key in object) b();
    `).toMatchInlineSnapshot(`
      for (const key in object) {
        b();
      }
    `));

  test('for of statement', () =>
    expectJS(`
      for (const item of array) b();
    `).toMatchInlineSnapshot(`
      for (const item of array) {
        b();
      }
    `));

  test('arrow function', () =>
    expectJS(`
      const x = () => (a(), b());
    `).toMatchInlineSnapshot(`
      const x = () => {
        return a(), b();
      };
    `));

  test('ignore empty statement', () =>
    expectJS(`
      while (arr.pop());
    `).toMatchInlineSnapshot(`
      while (arr.pop());
    `));
});

describe(numberExpressions, expectJS => {
  test('simplify', () =>
    expectJS(`
      console.log(-0x1021e + -0x7eac8 + 0x17 * 0xac9c);
    `).toMatchInlineSnapshot('console.log(431390);'));

  test('simplify coerced strings', () =>
    expectJS(`
      console.log(-"0xa6" - -331, -"0xa6");
    `).toMatchInlineSnapshot('console.log(165, -166);'));

  test('ignore string results', () =>
    expectJS(`
      console.log(0x1021e + "test");
    `).toMatchInlineSnapshot('console.log(0x1021e + "test");'));

  test('keep divisions', () =>
    expectJS(`
      console.log((-0x152f + 0x1281 * -0x1 + -0x18 * -0x1d1) / (0x83 * -0x1a + -0x19ea + 0x5f * 0x6a));
    `).toMatchInlineSnapshot('console.log(1000 / 30);'));
});

describe(unminifyBooleans, expectJS => {
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

describe(booleanIf, expectJS => {
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

describe(deadCode, expectJS => {
  test('always true', () => {
    expectJS(`
      if ("xyz" === "xyz") {
        a();
      } else {
        b();
      }
   `).toMatchInlineSnapshot('a();');
    expectJS(`
      if ("abc" === "xyz") {
        a();
      }
   `).toMatchInlineSnapshot('');
    expectJS(`
      if ("xyz" !== "abc") {
        a();
      } else {
        b();
      }
   `).toMatchInlineSnapshot('a();');
    expectJS(`
      if ("xyz" !== "xyz") {
        a();
      }
   `).toMatchInlineSnapshot('');

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
      if (!("abc" !== "xyz")) {
        a();
      } else {
        b();
      }
   `).toMatchInlineSnapshot('b();');
    expectJS(`
      if ("abc" === "xyz") a();
   `).toMatchInlineSnapshot('');

    expectJS(`
      "abc" === "xyz" ? a() : b();
    `).toMatchInlineSnapshot('b();');
    expectJS(`
      "abc" !== "abc" ? a() : b();
    `).toMatchInlineSnapshot('b();');
  });

  test('rename shadowed variables', () => {
    expectJS(`
      let x = 1;
      if ("a" === "a") {
        let x = 2;
        let y = 3;
      }
    `).toMatchInlineSnapshot(`
      let x = 1;
      let _x = 2;
      let y = 3;
    `);
  });
});

describe(ternaryToIf, expectJS => {
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

  test('returned', () =>
    expectJS(`
      return a ? b() : c();
    `).toMatchInlineSnapshot(`
      if (a) {
        return b();
      } else {
        return c();
      }
    `));

  test('ignore expression', () =>
    expectJS(`
      const x = a ? b() : c();
    `).toMatchInlineSnapshot('const x = a ? b() : c();'));
});

describe(mergeStrings, expectJS => {
  test('only strings', () =>
    expectJS(`
      "a" + "b" + "c";
    `).toMatchInlineSnapshot('"abc";'));
  test('with variables', () =>
    expectJS(`
      "a" + "b" + xyz + "c" + "d";
    `).toMatchInlineSnapshot('"ab" + xyz + "cd";'));
});

describe(mergeElseIf, expectJS => {
  test('merge', () =>
    expectJS(`
      if (x) {
      } else {
        if (y) {}
      }`).toMatchInlineSnapshot('if (x) {} else if (y) {}'));

  test('ignore when it contains other statements', () =>
    expectJS(`
      if (x) {
      } else {
        if (y) {}
        z();
      }`).toMatchInlineSnapshot(`
        if (x) {} else {
          if (y) {}
          z();
        }
      `));
});

describe(void0ToUndefined, expectJS => {
  test('void 0', () => expectJS('void 0').toMatchInlineSnapshot('undefined;'));
});

describe(yoda, expectJS => {
  test('strict equality', () =>
    expectJS('"red" === color').toMatchInlineSnapshot('color === "red";'));
  test('loose equality', () =>
    expectJS('null == x').toMatchInlineSnapshot('x == null;'));
  test('strict inequality', () =>
    expectJS('"red" !== color').toMatchInlineSnapshot('color !== "red";'));
  test('loose inequality', () =>
    expectJS('null != x').toMatchInlineSnapshot('x != null;'));
  test('less than', () => expectJS('0 < x').toMatchInlineSnapshot('x > 0;'));
  test('less or equal', () =>
    expectJS('0 <= x').toMatchInlineSnapshot('x >= 0;'));
  test('greater than', () => expectJS('0 > x').toMatchInlineSnapshot('x < 0;'));
  test('greater or equal', () =>
    expectJS('0 >= x').toMatchInlineSnapshot('x <= 0;'));
  test('multiply', () => expectJS('0 * x').toMatchInlineSnapshot('x * 0;'));
  test('xor', () => expectJS('0 ^ x').toMatchInlineSnapshot('x ^ 0;'));
  test('and', () => expectJS('0 & x').toMatchInlineSnapshot('x & 0;'));
  test('or', () => expectJS('0 | x').toMatchInlineSnapshot('x | 0;'));

  test('string', () =>
    expectJS('"str" == x').toMatchInlineSnapshot('x == "str";'));
  test('number', () => expectJS('1 == x').toMatchInlineSnapshot('x == 1;'));
  test('negative number', () =>
    expectJS('-1 == x').toMatchInlineSnapshot('x == -1;'));
  test('boolean', () =>
    expectJS('true == x').toMatchInlineSnapshot('x == true;'));
  test('null', () => expectJS('null == x').toMatchInlineSnapshot('x == null;'));
  test('undefined', () =>
    expectJS('undefined == x').toMatchInlineSnapshot('x == undefined;'));
  test('NaN', () => expectJS('NaN == x').toMatchInlineSnapshot('x == NaN;'));
  test('Infinity', () =>
    expectJS('Infinity == x').toMatchInlineSnapshot('x == Infinity;'));

  test('ignore other operators', () =>
    expectJS('2 + x').toMatchInlineSnapshot('2 + x;'));

  test('ignore when right side is a literal', () =>
    expectJS('1 === 2').toMatchInlineSnapshot('1 === 2;'));
});

describe(jsonParse, expectJS => {
  test('array', () =>
    expectJS('JSON.parse("[1,2,3]")').toMatchInlineSnapshot('[1, 2, 3];'));

  test('large literal', () =>
    expectJS('JSON.parse("1000000000000000000000")').toMatchInlineSnapshot(
      '1000000000000000000000;'
    ));

  test('ignore invalid json', () =>
    expectJS('JSON.parse("abc")').toMatchInlineSnapshot('JSON.parse("abc");'));
});

describe(unminify, expectJS => {
  test('logical expression to if and merge else-if', () =>
    expectJS(`
      if (x) {} else {y && z();}
    `).toMatchInlineSnapshot(`
      if (x) {} else if (y) {
        z();
      }
    `));

  test('returned ternary with sequence', () =>
    expectJS(`
    return a ? (b(), c()) : d();
  `).toMatchInlineSnapshot(`
    if (a) {
      b();
      return c();
    } else {
      return d();
    }
  `));

  test('merged string representation', () =>
    expectJS('x = "\uD83D" + "\uDC40";').toMatchInlineSnapshot('x = "👀";'));
});

describe(jsx, expectJS => {
  test('tag name type', () =>
    expectJS('React.createElement("div", null);').toMatchInlineSnapshot(
      '<div />;'
    ));

  test('component type', () =>
    expectJS('React.createElement(TodoList, null);').toMatchInlineSnapshot(
      '<TodoList />;'
    ));

  test('deeply nested member expression type', () =>
    expectJS(
      'React.createElement(components.list.TodoList, null);'
    ).toMatchInlineSnapshot(
      '<components.list.TodoList />;'
    ));

  test('rename component with conflicting name', () =>
    expectJS('function a(){} React.createElement(a, null);')
      .toMatchInlineSnapshot(`
        function _Component() {}
        <_Component />;
      `));

  test('attributes', () =>
    expectJS(
      'React.createElement("div", { "data-hover": "tooltip", style: { display: "block" } });'
    ).toMatchInlineSnapshot(`
      <div data-hover="tooltip" style={{
        display: "block"
      }} />;
    `));

  test('spread attributes', () =>
    expectJS('React.createElement("div", {...props});').toMatchInlineSnapshot(
      '<div {...props} />;'
    ));

  test('children', () =>
    expectJS(
      'React.createElement("div", null, React.createElement("span", null, "Hello ", name));'
    ).toMatchInlineSnapshot('<div><span>Hello {name}</span></div>;'));

  test('fragment', () =>
    expectJS(
      'React.createElement(React.Fragment, null, React.createElement("span", null), "test");'
    ).toMatchInlineSnapshot('<><span />test</>;'));

  test('fragment with key', () =>
    expectJS(
      'React.createElement(React.Fragment, { key: o })'
    ).toMatchInlineSnapshot('<React.Fragment key={o} />;'));
});

describe(jsxNew, expectJS => {
  test('tag name type', () =>
    expectJS('jsx("div", {});').toMatchInlineSnapshot('<div />;'));

  test('component type', () =>
    expectJS('jsx(TodoList, {});').toMatchInlineSnapshot(
      '<TodoList />;'
    ));

  test('deeply nested member expression type', () =>
    expectJS('jsx(components.list.TodoList, {});').toMatchInlineSnapshot(
      '<components.list.TodoList />;'
    ));

  test('rename component with conflicting name', () =>
    expectJS('function a(){} jsx(a, {});').toMatchInlineSnapshot(`
      function _Component() {}
      <_Component />;
    `));

  test('attributes', () =>
    expectJS(
      'jsx("div", { "data-hover": "tooltip", style: { display: "block" } });'
    ).toMatchInlineSnapshot(`
      <div data-hover="tooltip" style={{
        display: "block"
      }} />;
    `));

  test('spread attributes', () =>
    expectJS('jsx("div", {...props});').toMatchInlineSnapshot(
      '<div {...props} />;'
    ));

  test('children', () =>
    expectJS(
      'jsx("div", { children: jsxs("span", { children: ["Hello ", name ] }) });'
    ).toMatchInlineSnapshot('<div><span>Hello {name}</span></div>;'));

  test('component with key', () =>
    expectJS('jsx("div", {}, "test")').toMatchInlineSnapshot(
      '<div key="test" />;'
    ));

  test('array expression child', () =>
    expectJS('jsx("div", { children: [1] })').toMatchInlineSnapshot(
      '<div>{[1]}</div>;'
    ));

  test('fragment', () =>
    expectJS(
      'jsxs(React.Fragment, { children: [jsx("span", {}), "test"] });'
    ).toMatchInlineSnapshot('<><span />test</>;'));

  test('fragment with key', () =>
    expectJS('jsx(React.Fragment, {}, o)').toMatchInlineSnapshot(
      '<React.Fragment key={o} />;'
    ));
});

describe(inlineObjectProps, expectJS => {
  test('inline property', () =>
    expectJS(`
      const a = { x: 1 };
      console.log(a.x);
    `).toMatchInlineSnapshot('console.log(1);'));

  test('ignore non-existent properties', () =>
    expectJS(`
      const a = { x: 1 };
      console.log(a.__defineGetter__);
    `).toMatchInlineSnapshot(`
      const a = {
        x: 1
      };
      console.log(a.__defineGetter__);
    `));

  test('ignore shared variable references', () =>
    expectJS(`
      const a = { x: 1 };
      fn(a);
      console.log(a.x);
    `).toMatchInlineSnapshot(`
      const a = {
        x: 1
      };
      fn(a);
      console.log(a.x);
    `));

  test('ignore variable assignment', () =>
    expectJS(`
      let a = { x: 1 };
      a = { x: 2 };
      console.log(a.x);
    `).toMatchInlineSnapshot(`
      let a = {
        x: 1
      };
      a = {
        x: 2
      };
      console.log(a.x);
    `));

  test('ignore property assignment', () =>
    expectJS(`
      const a = { x: 1 };
      a.x = 2;
      console.log(a.x);
    `).toMatchInlineSnapshot(`
      const a = {
        x: 1
      };
      a.x = 2;
      console.log(a.x);
    `));

  test('ignore property assignment with array pattern', () =>
    expectJS(`
      let a = { x: 1 };
      [a.x] = [2];
      console.log(a.x);
    `).toMatchInlineSnapshot(`
      let a = {
        x: 1
      };
      [a.x] = [2];
      console.log(a.x);
    `));

  test('ignore property assignment with object pattern', () =>
    expectJS(`
      let a = { x: 1 };
      ({ x: a.x } = { x: 2 });
      console.log(a.x);
    `).toMatchInlineSnapshot(`
      let a = {
        x: 1
      };
      ({
        x: a.x
      } = {
        x: 2
      });
      console.log(a.x);
    `));

  test('ignore delete', () =>
    expectJS(`
      const a = { x: 1 };
      delete a.x;
      console.log(a.x);
    `).toMatchInlineSnapshot(`
      const a = {
        x: 1
      };
      delete a.x;
      console.log(a.x);
    `));

  test('ignore update expression', () =>
    expectJS(`
      const a = { x: 1 };
      a.x++;
      console.log(a.x);
    `).toMatchInlineSnapshot(`
      const a = {
        x: 1
      };
      a.x++;
      console.log(a.x);
    `));
});

describe(mergeObjectAssignments, expectJS => {
  test('inline properties without inlining object', () =>
    expectJS(`
     const obj = {};
     obj.foo = foo;
     obj.bar = 1;
     foo++;
     return obj;
    `).toMatchInlineSnapshot(`
      const obj = {
        foo: foo,
        bar: 1
      };
      foo++;
      return obj;
    `));

  test('inline properties and object', () =>
    expectJS(`
      const obj = {};
      obj.foo = 'foo';
      return obj;
    `).toMatchInlineSnapshot(`
      return {
        foo: 'foo'
      };
    `));

  test('computed properties', () =>
    expectJS(`
      const obj = {};
      obj["a b c"] = 1;
      obj[1] = 2;
      return obj;
    `).toMatchInlineSnapshot(`
      return {
        "a b c": 1,
        1: 2
      };
    `));

  test('ignore circular reference', () =>
    expectJS(`
      const obj = {};
      obj.foo = obj;
    `).toMatchInlineSnapshot(`
      const obj = {};
      obj.foo = obj;
    `));

  test('ignore call with possible circular reference', () =>
    expectJS(`
      const obj = {};
      obj.foo = fn();
    `).toMatchInlineSnapshot(`
      const obj = {};
      obj.foo = fn();
    `));
});
