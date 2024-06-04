import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

// >, >=, <, <= are not invertible because NaN <= 0 is false and NaN > 0 is false
// https://tc39.es/ecma262/multipage/abstract-operations.html#sec-islessthan

const INVERTED_BINARY_OPERATORS = {
  '==': '!=',
  '===': '!==',
  '!=': '==',
  '!==': '===',
} as const;

const INVERTED_LOGICAL_OPERATORS = {
  '||': '&&',
  '&&': '||',
} as const;

export default {
  name: 'invert-boolean-logic',
  tags: ['safe'],
  visitor: () => {
    const logicalExpression = m.logicalExpression(
      m.or(...Object.values(INVERTED_LOGICAL_OPERATORS)),
    );
    const logicalMatcher = m.unaryExpression('!', logicalExpression);

    const binaryExpression = m.capture(
      m.binaryExpression(m.or(...Object.values(INVERTED_BINARY_OPERATORS))),
    );
    const binaryMatcher = m.unaryExpression('!', binaryExpression);

    return {
      UnaryExpression: {
        exit(path) {
          const { argument } = path.node;

          if (binaryMatcher.match(path.node)) {
            binaryExpression.current!.operator =
              INVERTED_BINARY_OPERATORS[
                binaryExpression.current!
                  .operator as keyof typeof INVERTED_BINARY_OPERATORS
              ];

            path.replaceWith(binaryExpression.current!);
            this.changes++;
          } else if (logicalMatcher.match(path.node)) {
            let current = argument;
            while (logicalExpression.match(current)) {
              current.operator =
                INVERTED_LOGICAL_OPERATORS[
                  current.operator as keyof typeof INVERTED_LOGICAL_OPERATORS
                ];

              current.right = t.unaryExpression('!', current.right);
              if (!logicalExpression.match(current.left)) {
                current.left = t.unaryExpression('!', current.left);
              }
              current = current.left;
            }

            path.replaceWith(argument);
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
