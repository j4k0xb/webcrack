import { statement } from '@babel/template';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'ternaryToIf',
  tags: ['safe'],
  visitor() {
    const test = m.capture(m.anyExpression());
    const consequent = m.capture(m.anyExpression());
    const alternate = m.capture(m.anyExpression());
    const matcher = m.expressionStatement(
      m.conditionalExpression(test, consequent, alternate)
    );

    return {
      exit(path) {
        if (matcher.match(path.node)) {
          path.replaceWith(
            statement`if (${test.current}) { ${consequent.current}; } else { ${alternate.current}; }`()
          );
          this.changes++;
        }
      },
      noScope: true,
    };
  },
} satisfies Transform;
