import { describe, test } from 'vitest';
import { testWebpackModuleTransform } from '.';

const expectJS = testWebpackModuleTransform();

describe('webpack 4', () => {
  test('export named', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "counter", function() { return foo; });
      var foo = 1;
    `).toMatchInlineSnapshot(`export var counter = 1;`));

  test('export default expression;', () =>
    expectJS(`
      __webpack_exports__.default = 1;
    `).toMatchInlineSnapshot(`export default 1;`));

  test('export default variable', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "default", function() { return foo; });
      var foo = 1;
    `).toMatchInlineSnapshot(`export default 1;`));

  // TODO: or `export default foo;` ?
  test('export default variable with multiple references', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "default", function() { return foo; });
      var foo = 1;
      console.log(foo);
    `).toMatchInlineSnapshot(`
      var foo = 1;
      export { foo as default };
      console.log(foo);
    `));

  test('export default function', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "default", function() { return foo; });
      function foo() {}
    `).toMatchInlineSnapshot(`export default function foo() {}`));

  test('export default class', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "default", function() { return foo; });
      class foo {}
    `).toMatchInlineSnapshot(`export default class foo {}`));

  test('re-export named', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "readFile", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { readFile } from "lib";
    `));

  test('re-export named with multiple references', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "readFile", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
      lib.writeFile();
    `).toMatchInlineSnapshot(`
      import * as lib from "lib";
      export { readFile } from "lib";
      lib.writeFile();
    `));

  test('re-export named as named', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "foo", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { readFile as foo } from "lib";
    `));

  test('re-export named as default', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "default", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { readFile as default } from "lib";
    `));

  test('re-export default as named', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "foo", function() { return lib.default; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { default as foo } from "lib";
    `));

  test('re-export default as default', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "default", function() { return lib.default; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { default } from "lib";
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
            __webpack_require__.d(__webpack_exports__, key, function () {
              return lib[key];
            });
          })(importKey);
        }
      }
    `).toMatchInlineSnapshot(`
      export * from "./lib";
    `),
  );

  test('re-export all as named', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "lib", function() { return lib; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export * as lib from "lib";
    `));

  test.todo('re-export all as default', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, "default", function() { return lib; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`export * as default from "lib";`),
  );

  test('namespace object', () =>
    expectJS(`
        var lib_namespaceObject = {};
        __webpack_require__.d(lib_namespaceObject, "foo", function() { return foo; });
        function foo() {}
      `).toMatchInlineSnapshot(`
        var lib_namespaceObject = {};
        //webcrack:concatenated-module-export
        Object.defineProperty(lib_namespaceObject, "foo", {
          enumerable: true,
          get: () => foo
        });
        function foo() {}
      `));
});

describe('webpack 5', () => {
  test('export named', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, {
        counter: () => foo
      });
      var foo = 1;
    `).toMatchInlineSnapshot(`
      export var counter = 1;
    `));

  test('export same variable with multiple names', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, {
        counter: () => foo,
        increment: () => foo,
      });
      var foo = 1;
    `).toMatchInlineSnapshot(`
      export var counter = 1;
      export { counter as increment };
    `));

  test('export default expression;', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, {
        default: () => foo
      });
      var foo = 1;
    `).toMatchInlineSnapshot(`
      export default 1;
    `));

  test('export default variable', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, {
        default: () => foo
      });
      var foo = 1;
    `).toMatchInlineSnapshot(`
      export default 1;
    `));

  test('export default variable with multiple references', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, {
        default: () => foo
      });
      var foo = 1;
      console.log(foo);
    `).toMatchInlineSnapshot(`
      var foo = 1;
      export { foo as default };
      console.log(foo);
    `));

  test.todo('export object destructuring', () =>
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
    `),
  );

  test.todo('export array destructuring', () =>
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
    `),
  );

  test.todo('export as invalid identifier string name', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, {
        "...": () => foo
      });
      var foo = 1;
    `).toMatchInlineSnapshot(`
      var foo = 1;
      export { foo as "..." };
    `),
  );

  test('re-export named merging', () =>
    expectJS(`
      __webpack_require__.d(__webpack_exports__, {
        readFile: () => lib.readFile,
        writeFile: () => lib.writeFile,
      });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      export { readFile, writeFile } from "lib";
    `));

  test.todo('re-export all from commonjs', () =>
    expectJS(`
      var lib = __webpack_require__("lib");
      var libDef = __webpack_require__.n(lib);
      var reExportObject = {};
      for (const importKey in lib) {
        if (importKey !== "default") {
          reExportObject[importKey] = () => lib[importKey];
        }
      }
      __webpack_require__.d(__webpack_exports__, reExportObject);
    `).toMatchInlineSnapshot(`
      export * from "./lib";
    `),
  );

  test('namespace object', () =>
    expectJS(`
      var lib_namespaceObject = {};
      __webpack_require__.d(lib_namespaceObject, {
        foo: () => foo,
        bar: () => bar,
      });
      function foo() {}
      function bar() {}
    `).toMatchInlineSnapshot(`
        var lib_namespaceObject = {};
        //webcrack:concatenated-module-export
        Object.defineProperty(lib_namespaceObject, "bar", {
          enumerable: true,
          get: () => bar
        });
        //webcrack:concatenated-module-export
        Object.defineProperty(lib_namespaceObject, "foo", {
          enumerable: true,
          get: () => foo
        });
        function foo() {}
        function bar() {}
      `));
});
