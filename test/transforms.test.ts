import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { Assertion, describe as describeVitest, expect, test } from 'vitest';
import deadCode from '../src/deobfuscator/deadCode';
import objectLiterals from '../src/deobfuscator/objectLiterals';
import { Transform } from '../src/transforms';
import blockStatement from '../src/transforms/blockStatement';
import booleanIf from '../src/transforms/booleanIf';
import computedProperties from '../src/transforms/computedProperties';
import { applyTransform } from '../src/transforms/index';
import jsonParse from '../src/transforms/jsonParse';
import jsx from '../src/transforms/jsx';
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
    expectJS(String.raw`f("\x61", '"', "\u270F\uFE0F")`).toMatchInlineSnapshot(
      'f("a", "\\"", "✏️");'
    ));

  test('number', () =>
    expectJS('const a = 0x1;').toMatchInlineSnapshot('const a = 1;'));
});

describe(blockStatement, expectJS => {
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
});

describe(jsx, expectJS => {
  test('tag name type', () =>
    expectJS('React.createElement("div", null);').toMatchInlineSnapshot(
      '<div></div>;'
    ));

  test('component type', () =>
    expectJS('React.createElement(TodoList, null);').toMatchInlineSnapshot(
      '<TodoList></TodoList>;'
    ));

  test('deeply nested member expression type', () =>
    expectJS(
      'React.createElement(components.list.TodoList, null);'
    ).toMatchInlineSnapshot(
      '<components.list.TodoList></components.list.TodoList>;'
    ));

  test('rename component with conflicting name', () =>
    expectJS('function a(){} React.createElement(a, null);')
      .toMatchInlineSnapshot(`
      function _Component() {}
      <_Component></_Component>;
    `));

  test('attributes', () =>
    expectJS(
      'React.createElement("div", { "data-hover": "tooltip", style: { display: "block" } });'
    ).toMatchInlineSnapshot(`
      <div data-hover="tooltip" style={{
        display: "block"
      }}></div>;
    `));

  test('spread attributes', () =>
    expectJS('React.createElement("div", {...props});').toMatchInlineSnapshot(
      '<div {...props}></div>;'
    ));

  test('children', () =>
    expectJS(
      'React.createElement("div", null, React.createElement("span", null, "Hello ", name));'
    ).toMatchInlineSnapshot('<div><span>Hello {name}</span></div>;'));

  test('fragment', () =>
    expectJS(
      'React.createElement(React.Fragment, null, React.createElement("span", null), "test");'
    ).toMatchInlineSnapshot('<><span></span>test</>;'));

  test('fragment with key', () =>
    expectJS(
      'React.createElement(React.Fragment, { key: o })'
    ).toMatchInlineSnapshot('<React.Fragment key={o}></React.Fragment>;'));
});

describe(objectLiterals, expectJS => {
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
