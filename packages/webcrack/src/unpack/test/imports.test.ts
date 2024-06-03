import { describe, test } from 'vitest';
import { testWebpackModuleTransform } from '.';

const expectJS = testWebpackModuleTransform();

describe('webpack 4', () => {
  test('default import', () =>
    expectJS(`
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
      import _lib_default from "1";
      console.log(_lib_default);
      console.log(_lib_default);
    `));

  test('inlined default import of commonjs module', () =>
    expectJS(`
      var lib = __webpack_require__(1);
      console.log(__webpack_require__.n(lib).a);
    `).toMatchInlineSnapshot(`
      import _lib_default from "1";
      console.log(_lib_default);
    `));

  test('named import', () =>
    expectJS(`
      const lib = __webpack_require__("lib");
      console.log(lib.foo);
    `).toMatchInlineSnapshot(`
      import { foo } from "lib";
      console.log(foo);
    `));

  test('multiple named imports', () =>
    expectJS(`
      const lib = __webpack_require__("lib");
      console.log(lib.foo, lib.foo, lib.bar);
    `).toMatchInlineSnapshot(`
      import { bar, foo } from "lib";
      console.log(foo, foo, bar);
    `));

  test('named import with indirect call', () =>
    expectJS(`
      const lib = __webpack_require__("lib");
      console.log(Object(lib.foo)("bar"));
    `).toMatchInlineSnapshot(`
      import { foo } from "lib";
      console.log(foo("bar"));
    `));

  test('namespace import', () =>
    expectJS(`
      const lib = __webpack_require__("lib");
      console.log(lib);
    `).toMatchInlineSnapshot(`
      import * as lib from "lib";
      console.log(lib);
    `));

  test('combined namespace and default import', () =>
    expectJS(`
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

  test('indirect calls', () =>
    expectJS(`
      const lib = __webpack_require__("lib");
      console.log(Object(lib.foo)("bar"));
      console.log(Object(lib.default)("bar"));
    `).toMatchInlineSnapshot(`
      import _lib_default, { foo } from "lib";
      console.log(foo("bar"));
      console.log(_lib_default("bar"));
    `));

  test('sort import specifiers alphabetically', () =>
    expectJS(`
      const lib = __webpack_require__("lib");
      console.log(lib.xyz, lib.abc);
    `).toMatchInlineSnapshot(`
      import { abc, xyz } from "lib";
      console.log(xyz, abc);
    `));

  test.todo('hoist imports', () =>
    expectJS(`
      var _tmp;
      var lib = __webpack_require__("lib");
      var lib2 = __webpack_require__("lib2");
      console.log(lib, lib2);
    `).toMatchInlineSnapshot(`
      import * as lib from "lib";
      import * as lib2 from "lib2";
      var _tmp;
      console.log(lib, lib2);
    `),
  );

  // TODO: also create an import for the 2nd require call?
  test('mixed import/require', () =>
    expectJS(`
      var lib = __webpack_require__("lib");
      console.log(lib, __webpack_require__("lib2"));
    `).toMatchInlineSnapshot(`
      import * as lib from "lib";
      console.log(lib, require("lib2"));
    `));
});

describe('webpack 5', () => {
  test('named import with indirect call', () =>
    expectJS(`
      const lib = __webpack_require__("lib");
      console.log((0, lib.foo)("bar"));
    `).toMatchInlineSnapshot(`
      import { foo } from "lib";
      console.log(foo("bar"));
    `));

  test.todo('namespace import of commonjs module', () =>
    expectJS(`
      var _cache;
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
