import * as t from '@babel/types';
import * as m from '@webcrack/matchers';
import type { Transform } from '../../ast-utils';

const onVoidNumber = m.compileVisitor(
  m.unaryExpression('void', m.numericLiteral()),
);

export default {
  name: 'void-to-undefined',
  tags: ['safe'],
  scope: true,
  visitor: () =>
    onVoidNumber((path, state) => {
      if (!path.scope.hasBinding('undefined', { noGlobals: true })) {
        path.replaceWith(t.identifier('undefined'));
        state.changes++;
      }
    }),
} satisfies Transform;
