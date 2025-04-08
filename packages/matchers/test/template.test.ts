import { parse, parseExpression } from '@babel/parser';
import { expect, test } from 'vitest';
import * as m from '../src';

test('parse expression template', () => {
  const schema = m.expression`console.log(${m.or(m.numericLiteral(), m.stringLiteral())})`;
  const matcher = m.compile(schema);

  expect(matcher(parseExpression('console.log(1)'))).toEqual({});
  expect(matcher(parseExpression('console.log(true)'))).toBeUndefined();
});

test('parse statement template', () => {
  const schema = m.statement`if (${m.capture('test')});`;
  const matcher = m.compile(schema);

  const ast = parse(`if (1);`).program.body[0];
  expect(matcher(ast)).toMatchObject({ test: { value: 1 } });
});
