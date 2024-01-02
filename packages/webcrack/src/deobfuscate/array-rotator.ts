import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { callExpression } from '@codemod/matchers';
import { constMemberExpression, findParent, infiniteLoop } from '../ast-utils';
import type { StringArray } from './string-array';

export type ArrayRotator = NodePath<t.ExpressionStatement>;

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
export function findArrayRotator(
  stringArray: StringArray,
): ArrayRotator | undefined {
  // e.g. 'array'
  const arrayIdentifier = m.capture(m.identifier());

  // e.g. array.push(array.shift())
  const pushShift = m.callExpression(
    constMemberExpression(arrayIdentifier, 'push'),
    [
      m.callExpression(
        constMemberExpression(m.fromCapture(arrayIdentifier), 'shift'),
      ),
    ],
  );

  const callMatcher = m.callExpression(
    m.functionExpression(
      null,
      m.anything(),
      m.blockStatement(
        m.anyList(
          m.zeroOrMore(),
          infiniteLoop(
            m.matcher((node) => {
              return (
                m
                  .containerOf(callExpression(m.identifier('parseInt')))
                  .match(node) &&
                m
                  .blockStatement([
                    m.tryStatement(
                      m.containerOf(pushShift),
                      m.containerOf(pushShift),
                    ),
                  ])
                  .match(node)
              );
            }),
          ),
        ),
      ),
    ),
  );

  const matcher = m.expressionStatement(
    m.or(callMatcher, m.unaryExpression('!', callMatcher)),
  );

  for (const ref of stringArray.references) {
    const rotator = findParent(ref, matcher);
    if (rotator) {
      return rotator;
    }
  }
}
