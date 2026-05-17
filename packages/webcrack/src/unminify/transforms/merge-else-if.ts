import * as m from '@codemod/matchers';
import * as t from '@babel/types';
import { applyTransforms, type Transform } from '../../ast-utils';
import invertBooleanLogic from './invert-boolean-logic';
import removeDoubleNot from './remove-double-not';

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
    const matcherIf = m.ifStatement(
      m.anything(),
      m.blockStatement([nestedIf]),
      m.anything(),
    );
    const matchIfNegation = m.ifStatement(
      m.unaryExpression('!', m.anything()),
      m.anything(),
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
          if (
            matcherIf.match(path.node) &&
            path.node.alternate &&
            !nestedIf.match(path.node.alternate)
          ) {
            path.node.test = t.unaryExpression('!', path.node.test);
            path.node.consequent = path.node.alternate!;
            path.node.alternate = nestedIf.current;
            this.changes += applyTransforms(
              path.node,
              [invertBooleanLogic, removeDoubleNot],
              {
                log: false,
              },
            ).changes;
            this.changes++;
          }

          // if (!cond) { branch1 } else { branch2 }
          // -> if (cond) { branch2 } else { branch1 }
          if (
            matchIfNegation.match(path.node) &&
            path.node.alternate &&
            !nestedIf.match(path.node.alternate)
          ) {
            path.node.test = (path.node.test as t.UnaryExpression).argument;
            const temp = path.node.consequent;
            path.node.consequent = path.node.alternate!;
            path.node.alternate = temp;
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
