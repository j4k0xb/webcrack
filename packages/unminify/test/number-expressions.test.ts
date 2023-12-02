import { test } from 'vitest';
import { testTransform } from '.';
import { numberExpressions } from '../src/transforms';

const expectJS = testTransform(numberExpressions);

test('simplify', () =>
  expectJS(`
    console.log(-0x1021e + -0x7eac8 + 0x17 * 0xac9c);
  `).toMatchInlineSnapshot('console.log(431390);'));

test('simplify coerced strings', () =>
  expectJS(`
    console.log(-"0xa6" - -331, -"0xa6");
  `).toMatchInlineSnapshot('console.log(165, -166);'));

test('ignore string results', () =>
  expectJS(`
    console.log(0x1021e + "test");
  `).toMatchInlineSnapshot('console.log(0x1021e + "test");'));

test('keep divisions', () =>
  expectJS(`
    console.log((-0x152f + 0x1281 * -0x1 + -0x18 * -0x1d1) / (0x83 * -0x1a + -0x19ea + 0x5f * 0x6a));
  `).toMatchInlineSnapshot('console.log(1000 / 30);'));
