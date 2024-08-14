import { test } from 'vitest';
import { testTransform } from '../../../test';
import yoda from '../transforms/yoda';

const expectJS = testTransform(yoda);

test('strict equality', () =>
  expectJS('"red" === color').toMatchInlineSnapshot('color === "red";'));

test('loose equality', () =>
  expectJS('null == x').toMatchInlineSnapshot('x == null;'));

test('strict inequality', () =>
  expectJS('"red" !== color').toMatchInlineSnapshot('color !== "red";'));

test('loose inequality', () =>
  expectJS('null != x').toMatchInlineSnapshot('x != null;'));

test('less than', () => expectJS('0 < x').toMatchInlineSnapshot('x > 0;'));

test('less or equal', () =>
  expectJS('0 <= x').toMatchInlineSnapshot('x >= 0;'));

test('greater than', () => expectJS('0 > x').toMatchInlineSnapshot('x < 0;'));

test('greater or equal', () =>
  expectJS('0 >= x').toMatchInlineSnapshot('x <= 0;'));

test('multiply', () => expectJS('0 * x').toMatchInlineSnapshot('x * 0;'));

test('xor', () => expectJS('0 ^ x').toMatchInlineSnapshot('x ^ 0;'));

test('and', () => expectJS('0 & x').toMatchInlineSnapshot('x & 0;'));

test('or', () => expectJS('0 | x').toMatchInlineSnapshot('x | 0;'));

test('string', () =>
  expectJS('"str" == x').toMatchInlineSnapshot('x == "str";'));

test('number', () => expectJS('1 == x').toMatchInlineSnapshot('x == 1;'));

test('negative number', () =>
  expectJS('-1 == x').toMatchInlineSnapshot('x == -1;'));

test('boolean', () =>
  expectJS('true == x').toMatchInlineSnapshot('x == true;'));

test('null', () => expectJS('null == x').toMatchInlineSnapshot('x == null;'));

test('undefined', () =>
  expectJS('undefined == x').toMatchInlineSnapshot('x == undefined;'));

test('NaN', () => expectJS('NaN == x').toMatchInlineSnapshot('x == NaN;'));

test('Infinity', () =>
  expectJS('Infinity == x').toMatchInlineSnapshot('x == Infinity;'));

test('negative infinity', () =>
  expectJS('-Infinity == x').toMatchInlineSnapshot('x == -Infinity;'));

test('ignore other operators', () =>
  expectJS('2 + x').toMatchInlineSnapshot('2 + x;'));

test('ignore when right side is a literal', () =>
  expectJS('1 === 2').toMatchInlineSnapshot('1 === 2;'));

test('ignore when both sides are pure values', () =>
  expectJS('NaN == Infinity').toMatchInlineSnapshot(`NaN == Infinity;`));
