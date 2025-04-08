import { parse, parseExpression } from '@babel/parser';
import { expect, test } from 'vitest';
import * as m from '../src';

function parseStatement(input: string) {
  return parse(input, { allowReturnOutsideFunction: true }).program.body[0];
}

test('parse expression template', () => {
  const schema = m.expression`console.log(${m.or(m.numericLiteral(), m.stringLiteral())})`;
  const matcher = m.compile(schema);

  expect(matcher(parseExpression('console.log(1)'))).toBeTruthy();
  expect(matcher(parseExpression('console.log(true)'))).toBeUndefined();
});

test('parse statement template', () => {
  const schema = m.statement`if (${m.capture('test')});`;
  const matcher = m.compile(schema);

  expect(matcher(parseStatement('if (1);'))).toMatchObject({
    test: { value: 1 },
  });
});

test('expression statement template with any', () => {
  const schema = m.statement`if (1) ${m.any}`;
  const matcher = m.compile(schema);

  expect(matcher(parseStatement('if (1) foo();'))).toBeTruthy();
  expect(matcher(parseStatement('if (1) var a;'))).toBeTruthy();
  expect(matcher(parseStatement('if (1) var a; else;'))).toBeUndefined();
});
