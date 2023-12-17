import { test } from 'vitest';
import { testTransform } from '../../../test';
import { splitVariableDeclarations } from '../transforms';

const expectJS = testTransform(splitVariableDeclarations);

test('split variable declarations', () =>
  expectJS(`
    const a = 1, b = 2, c = 3;
  `).toMatchInlineSnapshot(`
    const a = 1;
    const b = 2;
    const c = 3;
  `));

test('split exported variable declarations', () =>
  expectJS(`
    export const a = 1, b = 2, c = 3;
  `).toMatchInlineSnapshot(`
    export const a = 1;
    export const b = 2;
    export const c = 3;
  `));

test('dont split in for loop', () =>
  expectJS(`
    for (let i = 0, j = 1; i < 10; i++, j++) var a, b;
  `).toMatchInlineSnapshot(`
    for (let i = 0, j = 1; i < 10; i++, j++) {
      var a;
      var b;
    }
  `));
