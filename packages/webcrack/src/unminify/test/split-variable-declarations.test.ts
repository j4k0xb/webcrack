import { test } from 'vitest';
import { testTransform } from '../../../test';
import splitVariableDeclarations from '../transforms/split-variable-declarations';

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

test('split var in for loop initializer', () =>
  expectJS(`
    for (var i = 0, j = 1;;) {}
  `).toMatchInlineSnapshot(`
    var i = 0;
    var j = 1;
    for (;;) {}
  `));

test('ignore let in for loop initializer', () => {
  expectJS(`
    let i;
    for (let i = 0, j = 1;;) {}
  `).toMatchInlineSnapshot(`
    let i;
    for (let i = 0, j = 1;;) {}
  `);

  expectJS(`
    for (let i = 0, j = 1;;) {
      setTimeout(() => console.log(i));
      if (++i > 3) break;
    }
  `).toMatchInlineSnapshot(`
    for (let i = 0, j = 1;;) {
      setTimeout(() => console.log(i));
      if (++i > 3) break;
    }
  `);
});

test('ignore for loop with test or update', () =>
  expectJS(`
    for (var i = 0, j = 1; i < 10; i++, j++) var a, b;
  `).toMatchInlineSnapshot(`
    for (var i = 0, j = 1; i < 10; i++, j++) {
      var a;
      var b;
    }
  `));
