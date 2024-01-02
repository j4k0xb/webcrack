import { statement } from '@babel/template';
import type * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

export default {
  name: 'logical-to-if',
  tags: ['safe'],
  visitor: () => {
    const andMatcher = m.expressionStatement(m.logicalExpression('&&'));
    const orMatcher = m.expressionStatement(m.logicalExpression('||'));

    const buildIf = statement`if (TEST) { BODY; }`;
    const buildIfNot = statement`if (!TEST) { BODY; }`;

    return {
      ExpressionStatement: {
        exit(path) {
          const expression = path.node.expression as t.LogicalExpression;
          if (andMatcher.match(path.node)) {
            path.replaceWith(
              buildIf({
                TEST: expression.left,
                BODY: expression.right,
              }),
            );
            this.changes++;
          } else if (orMatcher.match(path.node)) {
            path.replaceWith(
              buildIfNot({
                TEST: expression.left,
                BODY: expression.right,
              }),
            );
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
