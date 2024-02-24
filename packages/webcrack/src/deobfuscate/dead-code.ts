import type { NodePath } from '@babel/traverse';
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

          if (path.get('test').evaluateTruthy()) {
            replace(path, path.get('consequent'));
          } else if (path.node.alternate) {
            replace(path, path.get('alternate') as NodePath);
          } else {
            path.remove();
          }

          this.changes++;
        },
      },
    };
  },
} satisfies Transform;

function replace(path: NodePath<t.Conditional>, replacement: NodePath) {
  if (t.isBlockStatement(replacement.node)) {
    // If statements can contain variables that shadow variables in the parent scope.
    // Since the block scope is merged with the parent scope, we need to rename those
    // variables to avoid duplicate declarations.
    const childBindings = replacement.scope.bindings;
    for (const name in childBindings) {
      const binding = childBindings[name];
      if (path.scope.hasOwnBinding(name)) {
        renameFast(binding, path.scope.generateUid(name));
      }
      binding.scope = path.scope;
      path.scope.bindings[binding.identifier.name] = binding;
    }
    path.replaceWithMultiple(replacement.node.body);
  } else {
    path.replaceWith(replacement);
  }
}
