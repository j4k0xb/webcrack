import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'mergeElseIf',
  tags: ['safe'],
  visitor() {
    const nestedIf = m.capture(m.ifStatement());
    const matcher = m.ifStatement(
      m.anything(),
      m.anything(),
      m.blockStatement([nestedIf])
    );

    return {
      exit(path) {
        if (matcher.match(path.node)) {
          const alternate = path.get('alternate') as NodePath<t.IfStatement>;
          alternate.replaceWith(nestedIf.current!);
          this.changes++;
        }
      },
      noScope: true,
    };
  },
} satisfies Transform;
