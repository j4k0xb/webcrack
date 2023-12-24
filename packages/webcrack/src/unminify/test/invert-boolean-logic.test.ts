import { test } from 'vitest';
import { testTransform } from '../../../test';
import invertBooleanLogic from '../transforms/invert-boolean-logic';

const expectJS = testTransform(invertBooleanLogic);

test('loose equal', () =>
  expectJS('!(a == b);').toMatchInlineSnapshot(`a != b;`));

test('strict equal', () =>
  expectJS('!(a === b);').toMatchInlineSnapshot(`a !== b;`));

test('not equal', () =>
  expectJS('!(a != b);').toMatchInlineSnapshot(`a == b;`));

test('not strict equal', () =>
  expectJS('!(a !== b);').toMatchInlineSnapshot(`a === b;`));

test('greater than', () =>
  expectJS('!(a > b);').toMatchInlineSnapshot(`a <= b;`));

test('less than', () => expectJS('!(a < b);').toMatchInlineSnapshot(`a >= b;`));

test('greater than or equal', () =>
  expectJS('!(a >= b);').toMatchInlineSnapshot(`a < b;`));

test('less than or equal', () =>
  expectJS('!(a <= b);').toMatchInlineSnapshot(`a > b;`));

test('logical or', () =>
  expectJS('!(a || b || c);').toMatchInlineSnapshot(`!a && !b && !c;`));

test('logical and', () =>
  expectJS('!(a && b && c);').toMatchInlineSnapshot(`!a || !b || !c;`));

test('mixed logical', () =>
  expectJS('!((a ?? b) || c);').toMatchInlineSnapshot(`!(a ?? b) && !c;`));
