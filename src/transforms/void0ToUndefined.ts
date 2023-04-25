import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'void0ToUndefined',
  tags: ['safe'],
  visitor: () => {
    const matcher = m.unaryExpression('void', m.numericLiteral(0));
    return {
      exit(path) {
        if (matcher.match(path.node)) {
          path.replaceWith(t.identifier('undefined'));
          this.changes++;
        }
      },
      noScope: true,
    };
  },
} satisfies Transform;
