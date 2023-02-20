import * as t from '@babel/types';
import * as m from '@codemod/matchers';

export function infiniteLoop(body?: m.Matcher<t.Statement>) {
  return m.or(
    m.forStatement(undefined, null, undefined, body),
    m.whileStatement(trueMatcher, body)
  );
}

/**
 * Matches both identifier properties and string literal computed properties
 */
export function constMemberExpression(
  object: m.Matcher<t.Expression>,
  property: string
) {
  return m.or(
    m.memberExpression(object, m.identifier(property)),
    m.memberExpression(object, m.stringLiteral(property), true)
  );
}

const trueMatcher = m.or(
  m.booleanLiteral(true),
  m.unaryExpression('!', m.numericLiteral(0)),
  m.unaryExpression('!', m.unaryExpression('!', m.numericLiteral(1))),
  m.unaryExpression('!', m.unaryExpression('!', m.arrayExpression([])))
);
