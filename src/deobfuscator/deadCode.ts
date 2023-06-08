import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../transforms';

export default {
  name: 'deadCode',
  tags: ['unsafe'],
  visitor() {
    const stringComparison = m.binaryExpression(
      m.or('===', '==', '!==', '!='),
      m.stringLiteral(),
      m.stringLiteral()
    );
    const testMatcher = m.or(
      stringComparison,
      m.unaryExpression('!', stringComparison)
    );

    return {
      'IfStatement|ConditionalExpression': {
        exit(_path) {
          const path = _path as NodePath<
            t.IfStatement | t.ConditionalExpression
          >;

          if (!testMatcher.match(path.node.test)) return;

          // TODO: check binding conflicts
          if (path.get('test').evaluateTruthy()) {
            replace(path, path.node.consequent);
          } else if (path.node.alternate) {
            replace(path, path.node.alternate);
          } else {
            path.remove();
          }

          this.changes++;
        },
      },
      noScope: true,
    };
  },
} satisfies Transform;

function replace(path: NodePath, node: t.Node) {
  if (t.isBlockStatement(node)) {
    path.replaceWithMultiple(node.body);
  } else {
    path.replaceWith(node);
  }
}
