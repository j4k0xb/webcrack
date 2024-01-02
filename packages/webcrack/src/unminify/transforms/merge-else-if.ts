import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

export default {
  name: 'merge-else-if',
  tags: ['safe'],
  visitor() {
    const nestedIf = m.capture(m.ifStatement());
    const matcher = m.ifStatement(
      m.anything(),
      m.anything(),
      m.blockStatement([nestedIf]),
    );

    return {
      IfStatement: {
        exit(path) {
          if (matcher.match(path.node)) {
            path.node.alternate = nestedIf.current;
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
