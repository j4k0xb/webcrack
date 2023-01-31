import { expression } from '@babel/template';
import * as m from '@codemod/matchers';
import { Transform } from '.';

/**
 * ```js
 * callee(condition ? 1 : 2)
 * ```
 * ->
 * ```js
 * condition ? callee(1) : callee(2)
 * ```
 */
export default {
  name: 'extractTernaryCalls',
  tags: ['safe'],
  visitor: options => ({
    CallExpression(path) {
      if (
        matcher.match(path.node) &&
        (!options || options.callee === identifierMatch.current)
      ) {
        const conditional = conditionalMatch.current!;

        path.replaceWith(
          buildTernary({
            CONDITION: conditional.test,
            CALLEE: identifierMatch.current,
            ARG1: conditional.consequent,
            ARG2: conditional.alternate,
          })
        );
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform<{ callee: string }>;

const buildTernary = expression('CONDITION ? CALLEE(ARG1) : CALLEE(ARG2)');

const conditionalMatch = m.capture(m.conditionalExpression());
const identifierMatch = m.capture(m.anyString());
const matcher = m.callExpression(m.identifier(identifierMatch), [
  conditionalMatch,
]);
