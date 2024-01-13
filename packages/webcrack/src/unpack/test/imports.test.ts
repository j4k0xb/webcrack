import { describe, test } from 'vitest';
import { testWebpackModuleTransform } from '.';

const expectJS = testWebpackModuleTransform();

describe('webpack 4', () => {
  test('default import', () =>
    expectJS(`
      __webpack_require__.r(__webpack_exports__);
      const lib = __webpack_require__("lib");
      console.log(lib.default);
    `).toMatchInlineSnapshot(`
      import _lib_default from "lib";
      console.log(_lib_default);
    `));

  test('default import of commonjs module', () =>
    expectJS(`
      var lib = __webpack_require__(1);
      var _tmp = __webpack_require__.n(lib);
      console.log(_tmp.a);
      console.log(_tmp());
    `).toMatchInlineSnapshot(`
      import _default from "1";
      console.log(_default);
      console.log(_default);
    `));

  test('inlined default import of commonjs module', () =>
    expectJS(`
      var lib = __webpack_require__(1);
      var _tmp = __webpack_require__.n(lib).a;
      console.log(_tmp);
    `).toMatchInlineSnapshot(`
      import _default from "1";
      console.log(_default);
    `));

  test('named import', () =>
    expectJS(`
      __webpack_require__.r(__webpack_exports__);
      const lib = __webpack_require__("lib");
      console.log(lib.foo);
    `).toMatchInlineSnapshot(`
      import { foo } from "lib";
      console.log(foo);
    `));

  test('named import with indirect call', () =>
    expectJS(`
      __webpack_require__.r(__webpack_exports__);
      const lib = __webpack_require__("lib");
      console.log(Object(lib.foo)("bar"));
    `).toMatchInlineSnapshot(`
      import { foo } from "lib";
      console.log(foo("bar"));
    `));

  test('namespace import', () =>
    expectJS(`
      __webpack_require__.r(__webpack_exports__);
      const lib = __webpack_require__("lib");
      console.log(lib);
    `).toMatchInlineSnapshot(`
      import * as lib from "lib";
      console.log(lib);
    `));

  test('combined namespace and default import', () =>
    expectJS(`
      __webpack_require__.r(__webpack_exports__);
      const lib = __webpack_require__("lib");
      console.log(lib, lib.default);
    `).toMatchInlineSnapshot(`
      import * as lib from "lib";
      import _lib_default from "lib";
      console.log(lib, _lib_default);
    `));

  // TODO: maybe theres no var or it got inlined somewhere
  test('side effect import', () =>
    expectJS(`
      __webpack_require__.r(__webpack_exports__);
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      import "lib";
    `));

  test.todo('dynamic import', () =>
    expectJS(`
      __webpack_require__.e("chunkId").then(__webpack_require__.bind(null, "lib")).then((lib) => {
        console.log(lib);
      });
    `).toMatchInlineSnapshot(`
      import("lib").then((lib) => {
        console.log(lib);
      });
    `),
  );
});

describe('webpack 5', () => {
  test('named import with indirect call', () =>
    expectJS(`
      __webpack_require__.r(__webpack_exports__);
      const lib = __webpack_require__("lib");
      console.log((0, lib.foo)("bar"));
    `).toMatchInlineSnapshot(`
      import { foo } from "lib";
      console.log(foo("bar"));
    `));

  test.todo('namespace import of commonjs module', () =>
    expectJS(`
      var _cache;
      __webpack_require__.r(__webpack_exports__);
      const lib = __webpack_require__("lib");
      console.log(_cache ||= __webpack_require__.t(lib, 2));
    `).toMatchInlineSnapshot(`
      import * as lib from "lib";
      console.log(lib);
    `),
  );

  test.todo('dynamic import', () =>
    expectJS(`
      __webpack_require__.e("chunkId").then(__webpack_require__.bind(__webpack_require__, "lib")).then((lib) => {
        console.log(lib);
      });
    `).toMatchInlineSnapshot(`
      import("lib").then((lib) => {
        console.log(lib);
      });
    `),
  );
});
