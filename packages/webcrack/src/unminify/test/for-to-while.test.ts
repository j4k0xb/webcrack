import { test } from 'vitest';
import { testTransform } from '../../../test';
import forToWhile from '../transforms/for-to-while';

const expectJS = testTransform(forToWhile);

test('empty for loop to while true', () =>
  expectJS(`for (;;) b()`).toMatchInlineSnapshot(`while (true) b();`));

test('for loop with only test to while', () =>
  expectJS(`for (; a(); ) b();`).toMatchInlineSnapshot(`while (a()) b();`));

test('ignore for loop with init or update', () =>
  expectJS(`
    for (let i = 0;;) {}
    for (;; i++) {}
  `).toMatchInlineSnapshot(`
    for (let i = 0;;) {}
    for (;; i++) {}
  `));
