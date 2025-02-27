import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { constMemberExpression, type Transform } from '../../ast-utils';

export default {
  name: 'remove-double-not',
  tags: ['safe'],
  visitor() {
    const expression = m.capture(m.anyExpression());
    const doubleNot = m.unaryExpression(
      '!',
      m.unaryExpression('!', expression),
    );
    const tripleNot = m.unaryExpression('!', doubleNot);
    const arrayCall = m.callExpression(
      constMemberExpression(
        m.arrayExpression(),
        m.or(
          'filter',
          'find',
          'findLast',
          'findIndex',
          'findLastIndex',
          'some',
          'every',
        ),
      ),
      [m.arrowFunctionExpression(m.anything(), doubleNot)],
    );

    return {
      Conditional: {
        exit(path) {
          if (doubleNot.match(path.node.test)) {
            path.get('test').replaceWith(expression.current!);
            this.changes++;
          }
        },
      },
      UnaryExpression: {
        exit(path) {
          if (tripleNot.match(path.node)) {
            path.replaceWith(t.unaryExpression('!', expression.current!));
            this.changes++;
          }
        },
      },
      CallExpression: {
        exit(path) {
          if (arrayCall.match(path.node)) {
            (path.get('arguments.0.body') as NodePath).replaceWith(
              expression.current!,
            );
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
