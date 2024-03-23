import { test } from 'vitest';
import { testWebpackModuleTransform } from '.';

const expectJS = testWebpackModuleTransform();

test('replace hasOwnProperty', () =>
  expectJS(`__webpack_require__.o(obj, prop);`).toMatchInlineSnapshot(`
    Object.hasOwn(obj, prop);
  `));
