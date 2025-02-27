import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

export default {
  name: 'number-expressions',
  tags: ['safe'],
  visitor: () => ({
    'BinaryExpression|UnaryExpression': {
      exit(path) {
        if (!matcher.match(path.node)) return;
        const evaluated = path.evaluate();
        if (
          t.isBinaryExpression(path.node, { operator: '/' }) &&
          !Number.isInteger(evaluated.value)
        ) {
          return;
        }
        path.replaceWith(t.valueToNode(evaluated.value));
        path.skip();
        this.changes++;
      },
    },
  }),
} satisfies Transform;

const matcher = m.or(
  m.unaryExpression('-', m.or(m.stringLiteral(), m.numericLiteral())),
  m.binaryExpression(
    m.or('+', '-', '/', '%', '*', '**', '&', '|', '>>', '>>>', '<<', '^'),
    m.or(
      m.stringLiteral(),
      m.numericLiteral(),
      m.unaryExpression('-', m.numericLiteral()),
    ),
    m.or(
      m.stringLiteral(),
      m.numericLiteral(),
      m.unaryExpression('-', m.numericLiteral()),
    ),
  ),
);
