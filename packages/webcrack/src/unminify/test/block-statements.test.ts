import { test } from 'vitest';
import { testTransform } from '../../../test';
import { blockStatements } from '../transforms';

const expectJS = testTransform(blockStatements);

test('if statement', () =>
  expectJS(`
    if (a) b();
  `).toMatchInlineSnapshot(`
    if (a) {
      b();
    }
  `));

test('while statement', () =>
  expectJS(`
    while (a) b();
  `).toMatchInlineSnapshot(`
    while (a) {
      b();
    }
  `));

test('for statement', () =>
  expectJS(`
    for (;;) b();
  `).toMatchInlineSnapshot(`
    for (;;) {
      b();
    }
  `));

test('for-in statement', () =>
  expectJS(`
    for (const key in object) b();
  `).toMatchInlineSnapshot(`
    for (const key in object) {
      b();
    }
  `));

test('for-of statement', () =>
  expectJS(`
    for (const item of array) b();
  `).toMatchInlineSnapshot(`
    for (const item of array) {
      b();
    }
  `));

test('arrow function', () =>
  expectJS(`
    const x = () => (a(), b());
  `).toMatchInlineSnapshot(`
    const x = () => {
      return a(), b();
    };
  `));

test('ignore empty statement', () =>
  expectJS(`
    while (arr.pop());
  `).toMatchInlineSnapshot(`
    while (arr.pop());
  `));
