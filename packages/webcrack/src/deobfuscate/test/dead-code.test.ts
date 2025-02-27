import { test } from 'vitest';
import { testTransform } from '../../../test';
import deadCode from '../dead-code';

const expectJS = testTransform(deadCode);

test('keep true branch', () =>
  expectJS(`
    if ("a" === "a") {
      console.log("foo");
    } else {
      console.log("bar");
    }
  `).toMatchInlineSnapshot(`console.log("foo");`));

test('keep false branch', () =>
  expectJS(`
    if ("a" !== "a") {
      console.log("foo");
    } else {
      console.log("bar");
    }
  `).toMatchInlineSnapshot(`console.log("bar");`));

test('remove false branch without else', () =>
  expectJS(`
    if ("a" !== "a") {
      console.log("foo");
    }
  `).toMatchInlineSnapshot(``));

test('merge scopes', () =>
  expectJS(`
    let foo = 1;
    if ("a" === "a") {
      let foo = 2;
    }
  `).toMatchInlineSnapshot(`
    let foo = 1;
    let _foo = 2;
  `));
