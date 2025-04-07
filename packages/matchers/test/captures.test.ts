import * as t from '@babel/types';
import { expect, test } from 'vitest';
import * as m from '../src';

test('capture number', () => {
  const matcher = m.compile(m.numericLiteral(m.capture('value')));
  const captures = matcher(t.numericLiteral(1));
  expect(captures).toEqual({ value: 1 });
});

test('capture node', () => {
  const matcher = m.compile(m.variableDeclarator(m.capture('id')));
  const id = t.identifier('foo');
  const captures = matcher(t.variableDeclarator(id));
  expect(captures).toEqual({ id });
});

test('capture node with schema', () => {
  const matcher = m.compile(
    // @ts-expect-error idk
    m.binaryExpression('+', m.capture('left', m.numericLiteral())),
  );
  const left = t.numericLiteral(1);
  const captures = matcher(t.binaryExpression('+', left, t.numericLiteral(2)));
  expect(captures).toEqual({ left });

  const captures2 = matcher(
    t.binaryExpression('+', t.stringLiteral('x'), t.numericLiteral(2)),
  );
  expect(captures2).toBeUndefined();
});
