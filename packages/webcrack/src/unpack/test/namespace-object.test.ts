import { expect, test } from 'vitest';
import { testTransform } from '../../../test';
import namespaceObject from '../webpack/runtime/namespace-object';

const expectJS = testTransform(namespaceObject);

test('remove the __esModule property', () => {
  const result = { isESM: false };
  expectJS(
    `__webpack_require__.r(__webpack_exports__);`,
    result,
  ).toMatchInlineSnapshot(``);
  expect(result.isESM).toBe(true);
});

test('remove the __esModule property from a namespace object', () => {
  const result = { isESM: false };
  expectJS(
    `
    var lib_namespaceObject = {};
    __webpack_require__.r(lib_namespaceObject);
  `,
    result,
  ).toMatchInlineSnapshot(``);
  expect(result.isESM).toBe(true);
});
