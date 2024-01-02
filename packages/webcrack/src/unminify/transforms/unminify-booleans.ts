import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

export default {
  name: 'unminify-booleans',
  tags: ['safe'],
  visitor: () => ({
    UnaryExpression(path) {
      if (trueMatcher.match(path.node)) {
        path.replaceWith(t.booleanLiteral(true));
        this.changes++;
      } else if (falseMatcher.match(path.node)) {
        path.replaceWith(t.booleanLiteral(false));
        this.changes++;
      }
    },
  }),
} satisfies Transform;

const trueMatcher = m.or(
  m.unaryExpression('!', m.numericLiteral(0)),
  m.unaryExpression('!', m.unaryExpression('!', m.numericLiteral(1))),
  m.unaryExpression('!', m.unaryExpression('!', m.arrayExpression([]))),
);

const falseMatcher = m.or(
  m.unaryExpression('!', m.numericLiteral(1)),
  m.unaryExpression('!', m.arrayExpression([])),
);
