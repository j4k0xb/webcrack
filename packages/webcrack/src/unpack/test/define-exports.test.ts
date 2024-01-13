import { describe, test } from 'vitest';
import { testTransform } from '../../../test';
import defineExports from '../webpack/define-exports';

const expectJS = testTransform(defineExports);

describe('webpack 4', () => {
  test('export default expression;', () =>
    expectJS(`
      exports.default = 1;
    `).toMatchInlineSnapshot(`export default 1;`));

  test('export named', () =>
    expectJS(`
      __webpack_require__.d(exports, "counter", function() { return foo; });
      var foo = 1;
    `).toMatchInlineSnapshot(`export var counter = 1;`));

  test('export default variable', () =>
    expectJS(`
      __webpack_require__.d(exports, "default", function() { return foo; });
      var foo = 1;
    `).toMatchInlineSnapshot(`export default 1;`));

  test('export default variable with multiple references', () =>
    expectJS(`
      __webpack_require__.d(exports, "default", function() { return foo; });
      var foo = 1;
      console.log(foo);
    `).toMatchInlineSnapshot(`
      var foo = 1;
      export { foo as default };
      console.log(foo);
    `));

  test('export default function', () =>
    expectJS(`
      __webpack_require__.d(exports, "default", function() { return foo; });
      function foo() {}
    `).toMatchInlineSnapshot(`export default function foo() {}`));

  test('export default class', () =>
    expectJS(`
      __webpack_require__.d(exports, "default", function() { return foo; });
      class foo {}
    `).toMatchInlineSnapshot(`export default class foo {}`));

  test('re-export named', () =>
    expectJS(`
      __webpack_require__.d(exports, "readFile", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { readFile } from "lib";
      var lib = __webpack_require__("lib");
    `));

  test('re-export named with multiple references', () =>
    expectJS(`
      __webpack_require__.d(exports, "readFile", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
      lib.writeFile();
    `).toMatchInlineSnapshot(`
      export { readFile } from "lib";
      var lib = __webpack_require__("lib");
      lib.writeFile();
    `));

  test('re-export named as named', () =>
    expectJS(`
      __webpack_require__.d(exports, "foo", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { readFile as foo } from "lib";
      var lib = __webpack_require__("lib");
    `));

  test('re-export named as default', () =>
    expectJS(`
      __webpack_require__.d(exports, "default", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { readFile as default } from "lib";
      var lib = __webpack_require__("lib");
    `));

  test('re-export default as named', () =>
    expectJS(`
      __webpack_require__.d(exports, "foo", function() { return lib.default; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { default as foo } from "lib";
      var lib = __webpack_require__("lib");
    `));

  test('re-export default as default', () =>
    expectJS(`
      __webpack_require__.d(exports, "default", function() { return lib.default; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { default } from "lib";
      var lib = __webpack_require__("lib");
    `));

  // webpack just declares all the exports individually
  // hard to detect this case
  test.todo('re-export all'); // export * from 'lib';

  test.todo('re-export all from commonjs', () =>
    expectJS(`
      var lib = __webpack_require__("lib");
      var libDef = __webpack_require__.n(lib);
      for (var importKey in lib) {
        if (["default"].indexOf(importKey) < 0) {
          (function (key) {
            __webpack_require__.d(exports, key, function () {
              return lib[key];
            });
          })(importKey);
        }
      }
    `).toMatchInlineSnapshot(`
      export * from "./lib";
    `),
  );

  test.todo('re-export all as named', () =>
    expectJS(`
      __webpack_require__.d(exports, "lib", function() { return lib; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`export * as lib from "lib";`),
  );

  test.todo('re-export all as default', () =>
    expectJS(`
      __webpack_require__.d(exports, "default", function() { return lib; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`export * as default from "lib";`),
  );
});

describe('webpack 5', () => {
  test('export named', () =>
    expectJS(`
      __webpack_require__.d(exports, {
        counter: () => foo
      });
      var foo = 1;
    `).toMatchInlineSnapshot(`
      export var counter = 1;
    `));

  test.todo('export same variable with multiple names', () =>
    expectJS(`
      __webpack_require__.d(exports, {
        counter: () => foo,
        increment: () => foo,
      });
      var foo = 1;
    `).toMatchInlineSnapshot(`
      export var counter = 1;
      export { counter as increment };
    `),
  );

  test('export object destructuring', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, {
        bar: () => bar,
        name1: () => name1
      });
      const o = {
        name1: "foo",
        name2: "bar"
      };
      const {
        name1,
        name2: bar
      } = o;
    `).toMatchInlineSnapshot(`
      const o = {
        name1: "foo",
        name2: "bar"
      };
      export const {
        name1,
        name2: bar
      } = o;
    `));

  test('export array destructuring', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, {
        bar: () => bar,
        name1: () => name1
      });
      const o = ["foo", "bar"];
      const [name1, bar] = o;
    `).toMatchInlineSnapshot(`
      const o = ["foo", "bar"];
      export const [name1, bar] = o;
    `));

  test.todo('export as invalid identifier string name', () =>
    expectJS(`
      __webpack_require__.d(exports, {
        "...": () => foo
      });
      var foo = 1;
    `).toMatchInlineSnapshot(`
      var foo = 1;
      export { foo as "..." };
    `),
  );

  test.todo('re-export named merging', () =>
    expectJS(`
      __webpack_require__.d(exports, {
        readFile: () => lib.readFile,
        writeFile: () => lib.writeFile,
      });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { readFile, writeFile } from "lib";
      var lib = __webpack_require__("lib");
    `),
  );

  test.todo('re-export all from commonjs', () =>
    expectJS(`
      var lib = require("lib");
      var libDef = __webpack_require__.n(lib);
      var reExportObject = {};
      for (const importKey in lib) {
        if (importKey !== "default") {
          reExportObject[importKey] = () => lib[importKey];
        }
      }
      __webpack_require__.d(exports, reExportObject);
    `).toMatchInlineSnapshot(`
      export * from "./lib";
    `),
  );
});
