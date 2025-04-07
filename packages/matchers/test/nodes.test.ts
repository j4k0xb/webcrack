import * as t from '@babel/types';
import { expect, test } from 'vitest';
import * as m from '../src';

test('match any numeric literal', () => {
  const matcher = m.compile(m.numericLiteral());
  expect(matcher(t.numericLiteral(1))).toEqual({});
});

test('match specific numeric literal', () => {
  const matcher = m.compile(m.numericLiteral(1));
  expect(matcher(t.numericLiteral(1))).toEqual({});
  expect(matcher(t.numericLiteral(2))).toBeUndefined();
});
