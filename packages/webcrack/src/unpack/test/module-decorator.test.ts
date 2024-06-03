import { test } from 'vitest';
import { testTransform } from '../../../test';
import harmonyModuleDecorator from '../webpack/runtime/module-decorator';

const expectJS = testTransform(harmonyModuleDecorator);

test('remove harmony module decorator', () =>
  expectJS(`module = __webpack_require__.hmd(module);`).toMatchInlineSnapshot(
    ``,
  ));

test('remove node module decorator', () =>
  expectJS(`module = __webpack_require__.nmd(module);`).toMatchInlineSnapshot(
    ``,
  ));
