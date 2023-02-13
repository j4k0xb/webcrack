import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'mergeElseIf',
  tags: ['safe', 'readability'],
  visitor: () => ({
    exit(path) {
      if (matcher.match(path.node)) {
        (path.get('alternate') as NodePath<t.IfStatement>).replaceWith(
          nestedIf.current!
        );
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;

const nestedIf = m.capture(m.ifStatement());
const matcher = m.ifStatement(
  m.anything(),
  m.anything(),
  m.blockStatement([nestedIf])
);
