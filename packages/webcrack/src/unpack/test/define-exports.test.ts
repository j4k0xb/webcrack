import { test } from 'vitest';
import { testTransform } from '../../../test';
import defineExports from '../webpack/define-exports';

const expectJS = testTransform(defineExports);

test('export named (webpack 4)', () =>
  expectJS(`
    __webpack_require__.d(exports, "counter", function() { return foo; });
    var foo = 1;
  `).toMatchInlineSnapshot(`export var counter = 1;`));

test('export named (webpack 5)', () =>
  expectJS(`
    __webpack_require__.d(exports, {
      counter: () => foo,
      increment: () => increment,
    });
    var foo = 1;
    function increment() {}
  `).toMatchInlineSnapshot(`
    export var counter = 1;
    export function increment() {}
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
    __webpack_require__.d(exports, "...", function() { return foo; });
    var foo = 1;
  `).toMatchInlineSnapshot(`
    var foo = 1;
    export { foo as "..." };
  `),
);

test('re-export named', () =>
  expectJS(`
    __webpack_require__.d(exports, "readFile", function() { return fs.readFile; });
    var fs = __webpack_require__("fs");
  `).toMatchInlineSnapshot(`export { readFile } from "fs";`));

test('re-export named, keep variable', () =>
  expectJS(`
    __webpack_require__.d(exports, "readFile", function() { return fs.readFile; });
    var fs = __webpack_require__("fs");
    fs.writeFile();
  `).toMatchInlineSnapshot(`
    export { readFile } from "fs";
    var fs = __webpack_require__("fs");
    fs.writeFile();
  `));

test('re-export multiple named', () =>
  expectJS(`
    __webpack_require__.d(exports, {
      readFile: () => fs.readFile,
      writeFile: () => fs.writeFile,
    });
    var fs = __webpack_require__("fs");
  `).toMatchInlineSnapshot(`
    export { readFile } from "fs";
    export { writeFile } from "fs";
    var fs = __webpack_require__("fs");
  `));

test('re-export named as named', () =>
  expectJS(`
    __webpack_require__.d(exports, "foo", function() { return fs.readFile; });
    var fs = __webpack_require__("fs");
  `).toMatchInlineSnapshot(`export { readFile as foo } from "fs";`));

test('re-export named as default', () =>
  expectJS(`
    __webpack_require__.d(exports, "default", function() { return fs.readFile; });
    var fs = __webpack_require__("fs");
  `).toMatchInlineSnapshot(`export { readFile as default } from "fs";`));

test('re-export default as named', () =>
  expectJS(`
    __webpack_require__.d(exports, "foo", function() { return lib.default; });
    var lib = __webpack_require__("lib");
  `).toMatchInlineSnapshot(`export { default as foo } from "lib";`));

test('re-export default as default', () =>
  expectJS(`
    __webpack_require__.d(exports, "default", function() { return lib.default; });
    var lib = __webpack_require__("lib");
  `).toMatchInlineSnapshot(`export { default } from "lib";`));

// webpack just declares all the exports individually
// hard to detect this case
test.todo('re-export all'); // export * from 'fs';

test.todo('re-export all as named', () =>
  expectJS(`
    __webpack_require__.d(exports, "fs", function() { return fs; });
    var fs = __webpack_require__("fs");
  `).toMatchInlineSnapshot(`export * as fs from "fs";`),
);

test.todo('re-export all as default', () =>
  expectJS(`
    __webpack_require__.d(exports, "default", function() { return fs; });
    var fs = __webpack_require__("fs");
  `).toMatchInlineSnapshot(`export * as default from "fs";`),
);
