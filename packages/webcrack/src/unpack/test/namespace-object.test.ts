import { expect, test } from 'vitest';
import { testTransform } from '../../../test';
import namespaceObject from '../webpack/runtime/namespace-object';

const expectJS = testTransform(namespaceObject);

test('remove the __esModule property', () => {
  const result = { isESM: false };
  expectJS(`__webpack_require__.r(exports);`, result).toMatchInlineSnapshot(``);
  expect(result.isESM).toBe(true);
});
