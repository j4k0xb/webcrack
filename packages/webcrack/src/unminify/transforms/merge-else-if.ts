import * as m from '@codemod/matchers';
import * as t from '@babel/types';
import type { Transform } from '../../ast-utils';

export default {
  name: 'merge-else-if',
  tags: ['safe'],
  visitor() {
    const nestedIf = m.capture(m.ifStatement());
    const matcherElse = m.ifStatement(
      m.anything(),
      m.anything(),
      m.blockStatement([nestedIf]),
    );
    const matchedIf = m.ifStatement(
      m.anything(),
      m.blockStatement([nestedIf]),
      m.anything(),
    );

    return {
      IfStatement: {
        exit(path) {
          // if (cond) { ... } else { if (cond2) { ... } }
          // -> if (cond) { ... } else if (!cond2) { ... }
          if (matcherElse.match(path.node)) {
            path.node.alternate = nestedIf.current;
            this.changes++;
          }

          // if (cond) { if(cond2) { branch1 } else { branch2 } } else { branch3 }
          // -> if (!cond) { branch3 } else if (cond2) { branch1 } else { branch2 }
          if (matchedIf.match(path.node) && path.node.alternate) {
            path.node.test = t.unaryExpression('!', path.node.test);
            path.node.consequent = path.node.alternate!;
            path.node.alternate = nestedIf.current;
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
