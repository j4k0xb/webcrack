import { test } from 'vitest';
import { testTransform } from '.';
import mangle from '../src/transforms/mangle';

const expectJS = testTransform(mangle);

// https://github.com/j4k0xb/webcrack/issues/41
test('rename and extract non-literal default parameters', () => {
  expectJS(`
    function func(arg1, arg2 = 0, arg3 = arg1, arg4 = 30) {
      return arg1;
    }
  `).toMatchInlineSnapshot(`
    function a(a, b = 0, c = undefined, d = 30) {
      if (c !== undefined) c = a;
      return a;
    }
  `);

  expectJS(`
    const func = (arg1, arg2 = 0, arg3 = arg1, arg4 = 30) => arg1;
  `).toMatchInlineSnapshot(`
    const a = (a, b = 0, c = undefined, d = 30) => {
      if (c !== undefined) c = a;
      return a;
    };
  `);
});
