import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

// https://eslint.org/docs/latest/rules/yoda and https://babeljs.io/docs/en/babel-plugin-minify-flip-comparisons

const FLIPPED_OPERATORS = {
  '==': '==',
  '===': '===',
  '!=': '!=',
  '!==': '!==',
  '>': '<',
  '<': '>',
  '>=': '<=',
  '<=': '>=',
  '*': '*',
  '^': '^',
  '&': '&',
  '|': '|',
} as const;

export default {
  name: 'yoda',
  tags: ['safe'],
  visitor: () => {
    const pureValue = m.or(
      m.stringLiteral(),
      m.numericLiteral(),
      m.unaryExpression(
        '-',
        m.or(m.numericLiteral(), m.identifier('Infinity')),
      ),
      m.booleanLiteral(),
      m.nullLiteral(),
      m.identifier('undefined'),
      m.identifier('NaN'),
      m.identifier('Infinity'),
    );
    const matcher = m.binaryExpression(
      m.or(...Object.values(FLIPPED_OPERATORS)),
      pureValue,
      m.matcher((node) => !pureValue.match(node)),
    );

    return {
      BinaryExpression: {
        exit(path) {
          if (matcher.match(path.node)) {
            path.replaceWith(
              t.binaryExpression(
                FLIPPED_OPERATORS[
                  path.node.operator as keyof typeof FLIPPED_OPERATORS
                ],
                path.node.right,
                path.node.left as t.Expression,
              ),
            );
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
