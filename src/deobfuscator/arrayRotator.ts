import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
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
const arrayName = m.capture(m.anyString());
// e.g. array.push(array.shift())
const pushShift = m.callExpression(
  m.memberExpression(
    m.identifier(m.fromCapture(arrayName)),
    m.identifier('push')
  ),
  [
    m.callExpression(
      m.memberExpression(
        m.identifier(m.fromCapture(arrayName)),
        m.identifier('shift')
      )
    ),
  ]
);
const matcher = m.expressionStatement(
  m.callExpression(
    m.functionExpression(
      null,
      m.anything(),
      m.blockStatement(
        m.anyList<t.Statement>(
          m.zeroOrMore(),
          // var array = getStringArray();
          m.variableDeclaration(undefined, [
            m.variableDeclarator(m.identifier(arrayName)),
          ]),
          m.zeroOrMore(),
          infiniteLoop(
            m.blockStatement([
              m.tryStatement(
                m.containerOf(pushShift),
                m.containerOf(pushShift)
              ),
            ])
          )
        )
      )
    )
  )
);
