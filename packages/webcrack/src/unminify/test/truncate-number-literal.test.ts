import { test } from 'vitest';
import { testTransform } from '../../../test';
import { truncateNumberLiteral } from '../transforms';

const expectJS = testTransform(truncateNumberLiteral);

test('truncate float', () =>
  expectJS('!(a | 12.34)').toMatchInlineSnapshot(`!(a | 12);`));

test('truncate overflow', () =>
  expectJS('!(a ^ 0xfffffffff)').toMatchInlineSnapshot(`!(a ^ -1);`));

test('truncate shift overflow', () => {
  expectJS('!(a << 64)').toMatchInlineSnapshot(`!(a << 0);`);
  expectJS('!(1000 << a)').toMatchInlineSnapshot(`!(1000 << a);`);
});
