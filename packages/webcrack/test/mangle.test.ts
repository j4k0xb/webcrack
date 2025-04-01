import { test } from 'vitest';
import { testTransform } from '.';
import mangle from '../src/transforms/mangle';

const expectJS = testTransform(mangle);

test('variable', () => {
  expectJS('let x = 1;').toMatchInlineSnapshot('let vLN1 = 1;');
  expectJS('let x = exports;').toMatchInlineSnapshot(`let vExports = exports;`);
  expectJS('let x = () => {};').toMatchInlineSnapshot(`let vF = () => {};`);
  expectJS('let x = class {};').toMatchInlineSnapshot(`let vC = class {};`);
  expectJS('let x = Array(100);').toMatchInlineSnapshot(
    `let vArray = Array(100);`,
  );
  expectJS('let x = []').toMatchInlineSnapshot(`let vA = [];`);
  expectJS('let x = {}').toMatchInlineSnapshot(`let vO = {};`);
  expectJS('let [x] = 1;').toMatchInlineSnapshot(`let [v] = 1;`);
  expectJS('const x = require("fs");').toMatchInlineSnapshot(
    `const fs = require("fs");`,
  );
  expectJS(`
    const x = require("node:fs");
    const y = require("node:fs");
  `).toMatchInlineSnapshot(`
    const nodeFs = require("node:fs");
    const nodeFs2 = require("node:fs");
  `);

  expectJS(
    `
    let a = 100;
    let b = 200;
    let c = 300;
  `,
  ).toMatchInlineSnapshot(`
    let vLN100 = 100;
    let vLN200 = 200;
    let vLN300 = 300;
  `);

  expectJS(
    `
    let a = "hello world";
    let b = "foo-bar-🗿-ä";
  `,
  ).toMatchInlineSnapshot(`
    let vLSHelloWorld = "hello world";
    let vLSFoobar = "foo-bar-🗿-ä";
  `);

  expectJS(`let x = "";`).toMatchInlineSnapshot(`let vLS = "";`);

  const veryLongString = 'a'.repeat(1000);
  expectJS(`let x = "${veryLongString}";`).toMatchInlineSnapshot(
    `let vLSA${veryLongString.slice(0, 19)} = "${veryLongString}";`,
  );
});

test('ignore exports', () => {
  expectJS('export const x = 1;').toMatchInlineSnapshot('export const x = 1;');
  expectJS('export class X {}').toMatchInlineSnapshot(`export class X {}`);
});

test('only rename _0x variable', () => {
  expectJS(
    `
    let _0x4c3e = 1;
    let foo = 2;
    `,
    (id) => id.startsWith('_0x'),
  ).toMatchInlineSnapshot(`
    let vLN1 = 1;
    let foo = 2;
  `);
});

test('class', () => {
  expectJS('class abc {}').toMatchInlineSnapshot('class C {}');
});

test('function', () => {
  expectJS('function abc() {}').toMatchInlineSnapshot('function f() {}');
  expectJS('export default function x() {}').toMatchInlineSnapshot(
    `export default function f() {}`,
  );
});

test('parameters', () => {
  expectJS(`
    (x, y, z) => x + y + z;
  `).toMatchInlineSnapshot(`(p, p2, p3) => p + p2 + p3;`);
  expectJS('(x = 1) => x;').toMatchInlineSnapshot(`(p = 1) => p;`);
});

test('try-catch', () => {
  expectJS(`
    try {} catch (x) {}
  `).toMatchInlineSnapshot(`
    try {} catch (e) {}
  `);
});
