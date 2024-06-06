import { test } from 'vitest';
import { testTransform } from '../../../test';
import removeDoubleNot from '../transforms/remove-double-not';

const expectJS = testTransform(removeDoubleNot);

test('if statement', () =>
  expectJS(`
    if (!!a) {}
  `).toMatchInlineSnapshot(`
    if (a) {}
  `));

test('ternary', () =>
  expectJS(`
    !!a ? b : c;
  `).toMatchInlineSnapshot(`
    a ? b : c;
  `));

test('triple not', () =>
  expectJS(`
    return !!!a;
  `).toMatchInlineSnapshot(`
    return !a;
  `));

test('array filter', () =>
  expectJS(`
    [].filter(a => !!a);
  `).toMatchInlineSnapshot(`
    [].filter(a => a);
  `));
