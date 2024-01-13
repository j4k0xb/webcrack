import { test } from 'vitest';
import { testWebpackModuleTransform } from '.';
import hasOwnProperty from '../webpack/runtime/has-own-property';

const expectJS = testWebpackModuleTransform(
  hasOwnProperty,
  ({ scope }) => scope.bindings.__webpack_require__,
);

test('replace hasOwnProperty', () =>
  expectJS(`__webpack_require__.o(obj, prop);`).toMatchInlineSnapshot(`
    Object.hasOwn(obj, prop);
  `));
