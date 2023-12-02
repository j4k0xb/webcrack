import { test } from 'vitest';
import { testTransform } from '.';
import { ternaryToIf } from '../src/transforms';

const expectJS = testTransform(ternaryToIf);

test('statement', () =>
  expectJS(`
    a ? b() : c();
  `).toMatchInlineSnapshot(`
    if (a) {
      b();
    } else {
      c();
    }
  `));

test('returned', () =>
  expectJS(`
    return a ? b() : c();
  `).toMatchInlineSnapshot(`
    if (a) {
      return b();
    } else {
      return c();
    }
  `));

test('ignore expression', () =>
  expectJS(`
    const x = a ? b() : c();
  `).toMatchInlineSnapshot('const x = a ? b() : c();'));
