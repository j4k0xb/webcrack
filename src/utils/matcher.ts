import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Matcher } from '@codemod/matchers';

export function infiniteLoop(body?: m.Matcher<t.Statement>) {
  return m.or(
    m.forStatement(undefined, null, undefined, body),
    m.whileStatement(trueMatcher, body)
  );
}

export function constKey(name: string | m.Matcher<string>) {
  return m.or(m.identifier(name), m.stringLiteral(name));
}

export function buildIife(
  body?: Matcher<Array<t.Statement>> | Array<Matcher<t.Statement>>
) {
  return m.callExpression(
    m.functionExpression(null, [], body ? m.blockStatement(body) : undefined),
    []
  );
}

export const iife = buildIife();
export const emptyIife = buildIife([]);

/**
 * Matches both identifier properties and string literal computed properties
 */
export function constMemberExpression(
  object: m.Matcher<t.Expression>,
  property?: string | m.Matcher<string>
) {
  return m.or(
    m.memberExpression(object, m.identifier(property)),
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
) {
  const captures = Array.from({ length: params }, () =>
    m.capture(m.anyString())
  );

  return m.functionExpression(
    undefined,
    captures.map(m.identifier),
    m.blockStatement(body(...captures.map(c => m.identifier(m.fromCapture(c)))))
  );
}
