import { test } from 'vitest';
import { testTransform } from '../../../test';
import { infinity } from '../transforms';

const expectJS = testTransform(infinity);

test('infinity', () => expectJS('1/0').toMatchInlineSnapshot('Infinity;'));

test('negative infinity', () =>
  expectJS('-1/0').toMatchInlineSnapshot('-Infinity;'));

test('ignore when Infinity is declared in scope', () =>
  expectJS('let Infinity = 1; 1/0').toMatchInlineSnapshot(`
    let Infinity = 1;
    1 / 0;
  `));
