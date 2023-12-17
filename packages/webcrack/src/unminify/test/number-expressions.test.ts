import { test } from 'vitest';
import { testTransform } from '../../../test';
import { numberExpressions } from '../transforms';

const expectJS = testTransform(numberExpressions);

test('simplify', () =>
  expectJS(`-0x1021e + -0x7eac8 + 0x17 * 0xac9c`).toMatchInlineSnapshot(
    '431390;',
  ));

test('simplify coerced string', () =>
  expectJS(`-"0xa6" - -331; -"0xa6"`).toMatchInlineSnapshot(`
    165;
    -166;
  `));

test('simplify division', () => expectJS('10 / 2').toMatchInlineSnapshot('5;'));

test('keep divisions if it results in a decimal number', () =>
  expectJS(
    '(-0x152f + 0x1281 * -0x1 + -0x18 * -0x1d1) / (0x83 * -0x1a + -0x19ea + 0x5f * 0x6a)',
  ).toMatchInlineSnapshot('1000 / 30;'));

test('ignore string results', () =>
  expectJS('0x1021e + "test"').toMatchInlineSnapshot('0x1021e + "test";'));
