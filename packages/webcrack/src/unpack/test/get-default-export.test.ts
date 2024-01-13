import { test } from 'vitest';
import { testWebpackModuleTransform } from '.';
import { ImportExportManager } from '../webpack/import-export-manager';
import getDefaultExport from '../webpack/runtime/get-default-export';

const expectJS = testWebpackModuleTransform(
  getDefaultExport,
  ({ scope }, ast) =>
    new ImportExportManager(ast, scope.bindings.__webpack_require__),
);

test('replace default import', () =>
  expectJS(`
    var module = __webpack_require__(1);
    var _tmp = __webpack_require__.n(module);
    console.log(_tmp.a);
    console.log(_tmp());
  `).toMatchInlineSnapshot(`
    import _temp from "1";
    var module = __webpack_require__(1);
    console.log(_temp);
    console.log(_temp);
  `));

test('replace inlined default import', () =>
  expectJS(`
    var module = __webpack_require__(1);
    console.log(__webpack_require__.n(module).a);
    console.log(__webpack_require__.n(module)());
  `).toMatchInlineSnapshot(`
    import _temp from "1";
    var module = __webpack_require__(1);
    console.log(_temp);
    console.log(_temp);
  `));
