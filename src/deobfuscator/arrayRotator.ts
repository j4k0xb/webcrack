import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { callExpression } from '@codemod/matchers';
import { infiniteLoop } from '../utils/matcher';

export interface ArrayRotator {
  path: NodePath<t.ExpressionStatement>;
}
/**
 * Structure:
 * ```
 * iife (>= 2 parameters, called with 0 or 2 arguments)
 *  2 variable declarations (array and decoder)
 *  endless loop:
 *   try:
 *    if/break/parseInt/array.push(array.shift())
 *   catch:
 *    array.push(array.shift())
 * ```
 */
export function findArrayRotator(ast: t.Node) {
  let result: ArrayRotator | undefined;

  traverse(ast, {
    ExpressionStatement(path) {
      if (matcher.match(path.node)) {
        result = { path };
        path.stop();
      }
    },
    noScope: true,
  });

  return result;
}

// e.g. 'array'
const arrayIdentifier = m.capture(m.identifier());

// e.g. array.push(array.shift())
const pushShift = m.callExpression(
  m.memberExpression(arrayIdentifier, m.identifier('push')),
  [
    m.callExpression(
      m.memberExpression(m.fromCapture(arrayIdentifier), m.identifier('shift'))
    ),
  ]
);

const callMatcher = m.callExpression(
  m.functionExpression(
    null,
    m.anything(),
    m.blockStatement(
      m.anyList<t.Statement>(
        m.zeroOrMore(),
        infiniteLoop(
          m.matcher<t.BlockStatement>(node => {
            return (
              m
                .containerOf(callExpression(m.identifier('parseInt')))
                .match(node) &&
              m
                .blockStatement([
                  m.tryStatement(
                    m.containerOf(pushShift),
                    m.containerOf(pushShift)
                  ),
                ])
                .match(node)
            );
          })
        )
      )
    )
  )
);

const matcher = m.expressionStatement(
  m.or(callMatcher, m.unaryExpression('!', callMatcher))
);
