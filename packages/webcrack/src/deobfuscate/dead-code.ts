import type { NodePath, Scope } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../ast-utils';
import { renameFast } from '../ast-utils';

export default {
  name: 'dead-code',
  tags: ['unsafe'],
  scope: true,
  visitor() {
    const stringComparison = m.binaryExpression(
      m.or('===', '==', '!==', '!='),
      m.stringLiteral(),
      m.stringLiteral(),
    );
    const testMatcher = m.or(
      stringComparison,
      m.unaryExpression('!', stringComparison),
    );

    return {
      'IfStatement|ConditionalExpression': {
        exit(_path) {
          const path = _path as NodePath<
            t.IfStatement | t.ConditionalExpression
          >;

          if (!testMatcher.match(path.node.test)) return;

          const { scope } = path;
          // If statements can contain variables that shadow variables in the parent scope.
          // Since the block scope is merged with the parent scope, we need to rename those
          // variables to avoid duplicate declarations.
          function renameShadowedVariables(localScope: Scope) {
            if (localScope === scope) return;
            for (const name in localScope.bindings) {
              if (scope.hasBinding(name)) {
                renameFast(localScope.bindings[name], scope.generateUid(name));
              }
            }
          }

          if (path.get('test').evaluateTruthy()) {
            renameShadowedVariables(path.get('consequent').scope);
            replace(path, path.node.consequent);
          } else if (path.node.alternate) {
            renameShadowedVariables(path.get('alternate').scope);
            replace(path, path.node.alternate);
          } else {
            path.remove();
          }

          this.changes++;
        },
      },
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
