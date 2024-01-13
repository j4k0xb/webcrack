import { test } from 'vitest';
import { testTransform } from '../../../test';
import global from '../webpack/runtime/global';

const expectJS = testTransform(global);

test('replace __webpack_require__.g with global', () =>
  expectJS(`
    __webpack_require__.g.setTimeout(() => {});
  `).toMatchInlineSnapshot(`global.setTimeout(() => {});`));
