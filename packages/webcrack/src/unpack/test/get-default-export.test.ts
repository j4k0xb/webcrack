import { test } from 'vitest';
import { testWebpackModuleTransform } from '.';

const expectJS = testWebpackModuleTransform();

test('replace default import', () =>
  expectJS(`
    var module = __webpack_require__(1);
    var _tmp = __webpack_require__.n(module);
    console.log(_tmp.a);
    console.log(_tmp());
  `).toMatchInlineSnapshot(`
    import _default from "1";
    console.log(_default);
    console.log(_default);
  `));

test('replace inlined default import', () =>
  expectJS(`
    var module = __webpack_require__(1);
    console.log(__webpack_require__.n(module).a);
    console.log(__webpack_require__.n(module)());
  `).toMatchInlineSnapshot(`
    import _default from "1";
    console.log(_default);
    console.log(_default);
  `));
