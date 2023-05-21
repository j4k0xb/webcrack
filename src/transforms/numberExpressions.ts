import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'numberExpressions',
  tags: ['safe'],
  visitor: () => ({
    exit(path) {
      if (path.type !== 'NumericLiteral' && matcher.match(path.node)) {
        const evaluated = path.evaluate();
        if (evaluated.confident) {
          path.replaceWith(t.numericLiteral(evaluated.value as number));
          path.skip();
          this.changes++;
        }
      }
    },
    noScope: true,
  }),
} satisfies Transform;

const matcher: m.Matcher<t.Expression> = m.or(
  m.binaryExpression(
    m.or('+', '-', '*'),
    m.matcher(node => matcher.match(node)),
    m.matcher(node => matcher.match(node))
  ),
  m.binaryExpression(
    '-',
    m.or(
      m.stringLiteral(),
      m.matcher(node => matcher.match(node))
    ),
    m.or(
      m.stringLiteral(),
      m.matcher(node => matcher.match(node))
    )
  ),
  m.unaryExpression(
    '-',
    m.or(
      m.stringLiteral(),
      m.matcher(node => matcher.match(node))
    )
  ),
  m.numericLiteral()
);
