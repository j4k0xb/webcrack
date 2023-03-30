import { statement } from '@babel/template';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'booleanIf',
  tags: ['safe', 'readability'],
  visitor: () => ({
    ExpressionStatement(path) {
      const expression = path.node.expression as t.LogicalExpression;
      if (andMatcher.match(path.node)) {
        path.replaceWith(
          buildIfStatement({
            CONDITION: expression.left,
            CONSEQUENT: expression.right,
          })
        );
        this.changes++;
      } else if (orMatcher.match(path.node)) {
        path.replaceWith(
          buildNegatedIfStatement({
            CONDITION: expression.left,
            CONSEQUENT: expression.right,
          })
        );
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;

const buildIfStatement = statement('if (CONDITION) { CONSEQUENT; }');
const buildNegatedIfStatement = statement('if (!CONDITION) { CONSEQUENT; }');
const andMatcher = m.expressionStatement(m.logicalExpression('&&'));
const orMatcher = m.expressionStatement(m.logicalExpression('||'));
