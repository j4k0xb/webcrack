import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

export default {
  name: 'void-to-undefined',
  tags: ['safe'],
  scope: true,
  visitor: () => {
    const matcher = m.unaryExpression('void', m.numericLiteral(0));
    return {
      UnaryExpression: {
        exit(path) {
          if (
            matcher.match(path.node) &&
            !path.scope.hasBinding('undefined', { noGlobals: true })
          ) {
            path.replaceWith(t.identifier('undefined'));
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
