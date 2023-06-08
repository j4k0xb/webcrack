import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'deterministicIf',
  tags: ['unsafe'],
  visitor() {
    const testMatcher = m.binaryExpression(
      m.or('===', '==', '!==', '!='),
      m.stringLiteral(),
      m.stringLiteral()
    );

    return {
      IfStatement: {
        exit(path) {
          const test = path.get('test');
          if (testMatcher.match(test.node)) {
            // TODO: check binding conflicts
            if (test.evaluateTruthy() === true) {
              replace(path, path.node.consequent);
            } else if (path.node.alternate) {
              replace(path, path.node.alternate);
            } else {
              path.remove();
            }
            this.changes++;
          }
        },
      },
      ConditionalExpression: {
        exit(path) {
          const test = path.get('test');
          if (testMatcher.match(test.node)) {
            if (test.evaluateTruthy() === true) {
              replace(path, path.node.consequent);
            } else {
              replace(path, path.node.alternate);
            }
            this.changes++;
          }
        },
      },
      noScope: true,
    };
  },
} satisfies Transform;

function replace(path: NodePath, node: t.Node) {
  if (t.isBlockStatement(node)) {
    return path.replaceWithMultiple(node.body);
  } else {
    return path.replaceWith(node);
  }
}
