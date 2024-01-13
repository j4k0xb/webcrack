import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { describe, expect, test } from 'vitest';
import { applyTransform } from '../../ast-utils';
import { ImportExportManager } from '../webpack/import-export-manager';
import definePropertyGetters from '../webpack/runtime/define-property-getters';

const expectJS = (input: string) => {
  const ast = parse('var __webpack_require__; ' + input, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
  });
  traverse(ast, {
    Program(path) {
      const webpackRequireBinding = path.scope.getBinding(
        '__webpack_require__',
      );
      const manager = new ImportExportManager(ast, webpackRequireBinding);
      applyTransform(ast, definePropertyGetters, manager);
      webpackRequireBinding!.path.remove();
    },
  });
  return expect(ast);
};

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
      var lib = __webpack_require__("lib");
      export { readFile } from "lib";
    `));

  test('re-export named with multiple references', () =>
    expectJS(`
      __webpack_require__.d(exports, "readFile", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
      lib.writeFile();
    `).toMatchInlineSnapshot(`
      var lib = __webpack_require__("lib");
      export { readFile } from "lib";
      lib.writeFile();
    `));

  test('re-export named as named', () =>
    expectJS(`
      __webpack_require__.d(exports, "foo", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      var lib = __webpack_require__("lib");
      export { readFile as foo } from "lib";
    `));

  test('re-export named as default', () =>
    expectJS(`
      __webpack_require__.d(exports, "default", function() { return lib.readFile; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      var lib = __webpack_require__("lib");
      export { readFile as default } from "lib";
    `));

  test('re-export default as named', () =>
    expectJS(`
      __webpack_require__.d(exports, "foo", function() { return lib.default; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      var lib = __webpack_require__("lib");
      export { default as foo } from "lib";
    `));

  test('re-export default as default', () =>
    expectJS(`
      __webpack_require__.d(exports, "default", function() { return lib.default; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      var lib = __webpack_require__("lib");
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

  test('re-export all as named', () =>
    expectJS(`
      __webpack_require__.d(exports, "lib", function() { return lib; });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      var lib = __webpack_require__("lib");
      export * as lib from "lib";
    `));

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

  test('export same variable with multiple names', () =>
    expectJS(`
      __webpack_require__.d(exports, {
        counter: () => foo,
        increment: () => foo,
      });
      var foo = 1;
    `).toMatchInlineSnapshot(`
      export var counter = 1;
      export { counter as increment };
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
      __webpack_require__.d(exports, {
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
      __webpack_require__.d(exports, {
        readFile: () => lib.readFile,
        writeFile: () => lib.writeFile,
      });
      var lib = __webpack_require__("lib");
    `).toMatchInlineSnapshot(`
      var lib = __webpack_require__("lib");
      export { readFile, writeFile } from "lib";
    `));

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
