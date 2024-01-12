import { test } from 'vitest';
import { testTransform } from '../../../test';
import { splitForLoopVars } from '../transforms';

const expectJS = testTransform(splitForLoopVars);

test('extract a single unused var', () =>
  expectJS(`
    for (var i = 0;;) {}
  `).toMatchInlineSnapshot(`
    var i = 0;
    for (;;) {}
  `));

test('extract the first unused vars and keep the rest', () =>
  expectJS(`
    for (var i = 0, j = 1, k = 2; k < 5; k++) {}
  `).toMatchInlineSnapshot(`
    var i = 0;
    var j = 1;
    for (var k = 2; k < 5; k++) {}
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
