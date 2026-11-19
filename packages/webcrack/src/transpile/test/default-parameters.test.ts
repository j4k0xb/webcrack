import { describe, test } from 'vitest';
import { testTransform } from '../../../test';
import { defaultParameters } from '../transforms';

const expectJS = testTransform(defaultParameters);

describe('Babel', () => {
  test('multiple default parameters', () =>
    expectJS(`
      function f() {
        var e = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "foo";
        var f = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 5;
      }
    `).toMatchInlineSnapshot(`
      function f(e = "foo", f = 5) {}
    `));

  test('default parameter before the last one', () =>
    expectJS(`
      function f() {
        var x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
        var y = arguments.length > 1 ? arguments[1] : undefined;
      }
    `).toMatchInlineSnapshot(`
      function f(x = 1, y) {}
    `));

  test('default parameter with value true and false', () =>
    expectJS(`
      function f() {
        var x = arguments.length > 0 && arguments[0] !== undefined && arguments[0];
        var y = arguments.length <= 1 || arguments[1] === undefined || arguments[1];
      }
    `).toMatchInlineSnapshot(`
      function f(x = false, y = true) {}
    `));

  test('default parameter with gap before the last one', () =>
    expectJS(`
      function f(e) {
        var x = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var y = arguments.length > 5 ? arguments[5] : undefined;
      }
    `).toMatchInlineSnapshot(`
      function f(e, x = {}, _param, _param2, _param3, y) {}
    `));

  test('default destructuring parameter', () =>
    expectJS(`
      function f() {
        let {
          x,
          y
        } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        let [z] = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      }
    `).toMatchInlineSnapshot(`
      function f({
        x,
        y
      } = {}, [z] = []) {}
    `));

  test('default parameter (loose)', () =>
    expectJS(`
      function f(x, y) {
        if (x === undefined) { x = 1; }
      }
    `).toMatchInlineSnapshot(`
      function f(x = 1, y) {}
    `));

  test('ignore when other statements are in between', () =>
    expectJS(`
      function f(x, y) {
        if (x === undefined) { x = 1; }
        y = undefined;
        if (y === undefined) { y = 1; }
      }
    `).toMatchInlineSnapshot(`
      function f(x = 1, y) {
        y = undefined;
        if (y === undefined) {
          y = 1;
        }
      }
    `));
});

describe('"use strict" in the function body', () => {
  test('keep the parameters simple in sloppy code', () =>
    expectJS(`
      function f() {
        "use strict";
        var a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
        return a;
      }
    `).toMatchInlineSnapshot(`
      function f() {
        "use strict";

        var a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
        return a;
      }
    `));

  test('keep the parameters simple in sloppy code (loose)', () =>
    expectJS(`
      function f(a) {
        "use strict";
        if (a === undefined) { a = 1; }
        return a;
      }
    `).toMatchInlineSnapshot(`
      function f(a) {
        "use strict";

        if (a === undefined) {
          a = 1;
        }
        return a;
      }
    `));

  test('keep the parameters simple for destructuring', () =>
    expectJS(`
      function f() {
        "use strict";
        var { x } = arguments.length > 0 ? arguments[0] : undefined;
      }
    `).toMatchInlineSnapshot(`
      function f() {
        "use strict";

        var {
          x
        } = arguments.length > 0 ? arguments[0] : undefined;
      }
    `));

  test('still convert a plain parameter', () =>
    expectJS(`
      function f() {
        "use strict";
        var a = arguments.length > 0 ? arguments[0] : undefined;
        return a;
      }
    `).toMatchInlineSnapshot(`
      function f(a) {
        "use strict";

        return a;
      }
    `));

  test('remove the directive when the program is strict', () =>
    expectJS(`
      "use strict";
      function f() {
        "use strict";
        var a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
        return a;
      }
    `).toMatchInlineSnapshot(`
      "use strict";

      function f(a = 1) {
        return a;
      }
    `));

  test('remove the directive in a module', () =>
    expectJS(`
      export function f(a) {
        "use strict";
        if (a === undefined) { a = 1; }
        return a;
      }
    `).toMatchInlineSnapshot(`
      export function f(a = 1) {
        return a;
      }
    `));

  test('remove the directive in a class method', () =>
    expectJS(`
      var C = class {
        m() {
          "use strict";
          var a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
          return a;
        }
      };
    `).toMatchInlineSnapshot(`
      var C = class {
        m(a = 1) {
          return a;
        }
      };
    `));

  test('remove the directive inside a strict function', () =>
    expectJS(`
      function outer() {
        "use strict";
        return function f() {
          "use strict";
          var a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
          return a;
        };
      }
    `).toMatchInlineSnapshot(`
      function outer() {
        "use strict";

        return function f(a = 1) {
          return a;
        };
      }
    `));
});
