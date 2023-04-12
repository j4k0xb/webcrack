import { expression } from '@babel/template';
import * as m from '@codemod/matchers';
import { Transform } from '.';

/**
 * ```js
 * callee(test ? 1 : 2)
 * ```
 * ->
 * ```js
 * test ? callee(1) : callee(2)
 * ```
 */
export default {
  name: 'extractTernaryCalls',
  tags: ['safe'],
  visitor: options => ({
    CallExpression(path) {
      if (
        matcher.match(path.node) &&
        (!options || options.callee === calleeName.current)
      ) {
        const { test, consequent, alternate } = conditional.current!;
        const callee = calleeName.current!;

        path.replaceWith(
          expression`${test} ? ${callee}(${consequent}) : ${callee}(${alternate})`()
        );
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform<{ callee: string }>;

const conditional = m.capture(m.conditionalExpression());
const calleeName = m.capture(m.anyString());
const matcher = m.callExpression(m.identifier(calleeName), [conditional]);
