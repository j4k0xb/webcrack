import * as t from '@babel/types';
import * as m from '@codemod/matchers';

export function infiniteLoop(
  body?: m.Matcher<t.Statement>
): m.Matcher<t.ForStatement | t.WhileStatement> {
  return m.or(
    m.forStatement(undefined, null, undefined, body),
    m.forStatement(undefined, m.arrayExpression([]), undefined, body),
    m.whileStatement(trueMatcher, body)
  );
}

export function constKey(
  name?: string | m.Matcher<string>
): m.Matcher<t.Identifier | t.StringLiteral> {
  return m.or(m.identifier(name), m.stringLiteral(name));
}

export function matchIife(
  body?: m.Matcher<t.Statement[]> | m.Matcher<t.Statement>[]
): m.Matcher<t.CallExpression> {
  return m.callExpression(
    m.functionExpression(null, [], body ? m.blockStatement(body) : undefined),
    []
  );
}

export const iife = matchIife();
export const emptyIife = matchIife([]);

/**
 * Matches both identifier properties and string literal computed properties
 */
export function constMemberExpression(
  object: m.Matcher<t.Expression>,
  property?: string | m.Matcher<string>
): m.Matcher<t.MemberExpression> {
  return m.or(
    m.memberExpression(object, m.identifier(property), false),
    m.memberExpression(object, m.stringLiteral(property), true)
  );
}

export const trueMatcher = m.or(
  m.booleanLiteral(true),
  m.unaryExpression('!', m.numericLiteral(0)),
  m.unaryExpression('!', m.unaryExpression('!', m.numericLiteral(1))),
  m.unaryExpression('!', m.unaryExpression('!', m.arrayExpression([])))
);

export const falseMatcher = m.or(
  m.booleanLiteral(false),
  m.unaryExpression('!', m.arrayExpression([]))
);

/**
 * Function expression matcher that captures the parameters
 * and allows them to be referenced in the body.
 */
export function createFunctionMatcher(
  params: number,
  body: (
    ...captures: m.Matcher<t.Identifier>[]
  ) => m.Matcher<t.Statement[]> | m.Matcher<t.Statement>[]
): m.Matcher<t.FunctionExpression> {
  const captures = Array.from({ length: params }, () =>
    m.capture(m.anyString())
  );

  return m.functionExpression(
    undefined,
    captures.map(m.identifier),
    m.blockStatement(body(...captures.map(c => m.identifier(m.fromCapture(c)))))
  );
}

