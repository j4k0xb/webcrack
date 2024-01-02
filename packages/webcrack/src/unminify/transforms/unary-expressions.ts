import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

export default {
  name: 'unary-expressions',
  tags: ['safe'],
  visitor() {
    const argument = m.capture(m.anyExpression());
    const matcher = m.expressionStatement(
      m.unaryExpression(m.or('void', '!', 'typeof'), argument),
    );
    const returnVoid = m.returnStatement(m.unaryExpression('void', argument));
    return {
      ExpressionStatement: {
        exit(path) {
          if (!matcher.match(path.node)) return;
          path.replaceWith(argument.current!);
          this.changes++;
        },
      },
      ReturnStatement: {
        exit(path) {
          if (!returnVoid.match(path.node)) return;
          path.replaceWith(argument.current!);
          path.insertAfter(t.returnStatement());
          this.changes++;
        },
      },
    };
  },
} satisfies Transform;
