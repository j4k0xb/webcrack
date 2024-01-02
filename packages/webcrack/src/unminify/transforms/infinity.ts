import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

export default {
  name: 'infinity',
  tags: ['safe'],
  scope: true,
  visitor: () => {
    const infinityMatcher = m.binaryExpression(
      '/',
      m.numericLiteral(1),
      m.numericLiteral(0),
    );
    const negativeInfinityMatcher = m.binaryExpression(
      '/',
      m.unaryExpression('-', m.numericLiteral(1)),
      m.numericLiteral(0),
    );

    return {
      BinaryExpression: {
        exit(path) {
          if (path.scope.hasBinding('Infinity', { noGlobals: true })) return;

          if (infinityMatcher.match(path.node)) {
            path.replaceWith(t.identifier('Infinity'));
            this.changes++;
          } else if (negativeInfinityMatcher.match(path.node)) {
            path.replaceWith(t.unaryExpression('-', t.identifier('Infinity')));
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
