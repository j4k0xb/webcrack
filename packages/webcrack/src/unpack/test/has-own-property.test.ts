import { test } from 'vitest';
import { testTransform } from '../../../test';
import hasOwnProperty from '../webpack/runtime/has-own-property';

const expectJS = testTransform(hasOwnProperty);

test('replace hasOwnProperty', () =>
  expectJS(`__webpack_require__.o(obj, prop);`).toMatchInlineSnapshot(`
    Object.hasOwn(obj, prop);
  `));
