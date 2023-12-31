import { test } from 'vitest';
import { testTransform } from '.';
import mangle from '../src/transforms/mangle';

const expectJS = testTransform(mangle);

// https://github.com/j4k0xb/webcrack/issues/41
test('rename default parameters of function', () => {
  expectJS(`
    function func(arg1, arg2 = 0, arg3 = arg1, arg4 = arg1) {
      return arg1;
    }
  `).toMatchInlineSnapshot(`
    function a(a, b = 0, c = undefined, d = undefined) {
      if (c === undefined) c = a;
      if (d === undefined) d = a;
      return a;
    }
  `);
});

test('rename default parameters of arrow function', () => {
  expectJS(`
    const func = (arg1, arg2 = 0, arg3 = arg1, arg4 = arg1) => arg1;
  `).toMatchInlineSnapshot(`
    const a = (a, b = 0, c = undefined, d = undefined) => {
      if (c === undefined) c = a;
      if (d === undefined) d = a;
      return a;
    };
  `);
});

test('rename default destructuring parameters', () => {
  expectJS(`
    function func(arg1, [arg2] = arg1) {
      return arg2;
    }
  `).toMatchInlineSnapshot(`
    function a(a, b = undefined) {
      var [c] = b === undefined ? a : b;
      return c;
    }
  `);
});
