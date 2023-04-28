import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

// https://eslint.org/docs/latest/rules/yoda

const flippedOperators = {
  '==': '==',
  '===': '===',
  '!=': '!=',
  '!==': '!==',
  '>': '<',
  '<': '>',
  '>=': '<=',
  '<=': '>=',
} as const;

export default {
  name: 'yoda',
  tags: ['safe'],
  visitor: () => {
    const matcher = m.binaryExpression(
      // @ts-expect-error m.or overload doesn't support arbitrary number of arguments
      m.or(...Object.keys(flippedOperators)),
      m.or(
        m.stringLiteral(),
        m.numericLiteral(),
        m.booleanLiteral(),
        m.nullLiteral(),
        m.identifier('undefined')
      ),
      m.matcher(node => !t.isLiteral(node!))
    );

    return {
      exit({ node }) {
        if (matcher.match(node)) {
          [node.left, node.right] = [node.right, node.left as t.Expression];
          node.operator =
            flippedOperators[node.operator as keyof typeof flippedOperators];
          this.changes++;
        }
      },
      noScope: true,
    };
  },
} satisfies Transform;
