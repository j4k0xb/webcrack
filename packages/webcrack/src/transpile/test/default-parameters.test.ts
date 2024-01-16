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
