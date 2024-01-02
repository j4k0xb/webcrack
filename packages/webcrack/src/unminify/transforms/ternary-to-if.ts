import { statement } from '@babel/template';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

export default {
  name: 'ternary-to-if',
  tags: ['safe'],
  visitor() {
    const test = m.capture(m.anyExpression());
    const consequent = m.capture(m.anyExpression());
    const alternate = m.capture(m.anyExpression());
    const conditional = m.conditionalExpression(test, consequent, alternate);

    const buildIf = statement`if (TEST) { CONSEQUENT; } else { ALTERNATE; }`;
    const buildIfReturn = statement`if (TEST) { return CONSEQUENT; } else { return ALTERNATE; }`;

    return {
      ExpressionStatement: {
        exit(path) {
          if (conditional.match(path.node.expression)) {
            path.replaceWith(
              buildIf({
                TEST: test.current,
                CONSEQUENT: consequent.current,
                ALTERNATE: alternate.current,
              }),
            );
            this.changes++;
          }
        },
      },
      ReturnStatement: {
        exit(path) {
          if (conditional.match(path.node.argument)) {
            path.replaceWith(
              buildIfReturn({
                TEST: test.current,
                CONSEQUENT: consequent.current,
                ALTERNATE: alternate.current,
              }),
            );
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
