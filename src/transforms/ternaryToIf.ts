import { statement } from '@babel/template';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'ternaryToIf',
  tags: ['safe', 'readability'],
  visitor: () => ({
    enter(path) {
      if (matcher.match(path.node)) {
        path.replaceWith(
          buildIfStatement({
            CONDITION: test.current,
            CONSEQUENT: consequent.current,
            ALTERNATE: alternate.current,
          })
        );
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;

const test = m.capture(m.anyExpression());
const consequent = m.capture(m.anyExpression());
const alternate = m.capture(m.anyExpression());
const matcher = m.expressionStatement(
  m.conditionalExpression(test, consequent, alternate)
);

const buildIfStatement = statement(
  `if (CONDITION) { CONSEQUENT; } else { ALTERNATE; }`
);
