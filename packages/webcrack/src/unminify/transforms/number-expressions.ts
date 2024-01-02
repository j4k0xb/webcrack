import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

export default {
  name: 'number-expressions',
  tags: ['safe'],
  visitor: () => ({
    'BinaryExpression|UnaryExpression': {
      exit(path) {
        if (matcher.match(path.node)) {
          const evaluated = path.evaluate();
          if (evaluated.confident) {
            // Heuristic: Simplifying a division that results in a non-integer probably doesn't increase readability
            if (
              path.node.type === 'BinaryExpression' &&
              path.node.operator === '/' &&
              !Number.isInteger(evaluated.value)
            ) {
              return;
            }

            path.replaceWith(t.valueToNode(evaluated.value));
            path.skip();
            this.changes++;
          }
        }
      },
    },
  }),
} satisfies Transform;

const matcher: m.Matcher<t.Expression> = m.or(
  m.binaryExpression(
    m.or('+', '-', '*', '/'),
    m.matcher((node) => matcher.match(node)),
    m.matcher((node) => matcher.match(node)),
  ),
  m.binaryExpression(
    '-',
    m.or(
      m.stringLiteral(),
      m.matcher((node) => matcher.match(node)),
    ),
    m.or(
      m.stringLiteral(),
      m.matcher((node) => matcher.match(node)),
    ),
  ),
  m.unaryExpression(
    '-',
    m.or(
      m.stringLiteral(),
      m.matcher((node) => matcher.match(node)),
    ),
  ),
  m.numericLiteral(),
);
