import { test } from 'vitest';
import { testWebpackModuleTransform } from '.';

const expectJS = testWebpackModuleTransform();

test('rename module, exports and require', () =>
  expectJS(`
    __webpack_module__.exports = __webpack_require__("foo");
    __webpack_exports__.foo = 1;
  `).toMatchInlineSnapshot(`
    module.exports = require("foo");
    exports.foo = 1;
  `));
