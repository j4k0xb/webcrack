import type { Binding, NodePath } from '@babel/traverse';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { codePreview } from './generator';

export function renameFast(binding: Binding, newName: string): void {
  binding.referencePaths.forEach((ref) => {
    if (!ref.isIdentifier()) {
      throw new Error(
        `Unexpected reference (${ref.type}): ${codePreview(ref.node)}`,
      );
    }

    // To avoid conflicts with other bindings of the same name
    if (ref.scope.hasBinding(newName)) ref.scope.rename(newName);
    ref.node.name = newName;
  });

  // Also update assignments
  const patternMatcher = m.assignmentExpression(
    '=',
    m.or(m.arrayPattern(), m.objectPattern()),
  );
  binding.constantViolations.forEach((ref) => {
    // To avoid conflicts with other bindings of the same name
    if (ref.scope.hasBinding(newName)) ref.scope.rename(newName);

    if (ref.isAssignmentExpression() && t.isIdentifier(ref.node.left)) {
      ref.node.left.name = newName;
    } else if (ref.isUpdateExpression() && t.isIdentifier(ref.node.argument)) {
      ref.node.argument.name = newName;
    } else if (ref.isVariableDeclarator() && t.isIdentifier(ref.node.id)) {
      ref.node.id.name = newName;
    } else if (ref.isFor() || patternMatcher.match(ref.node)) {
      traverse(ref.node, {
        Identifier(path) {
          if (path.scope !== ref.scope) return path.skip();
          if (path.node.name === binding.identifier.name) {
            path.node.name = newName;
          }
        },
        noScope: true,
      });
    } else {
      throw new Error(
        `Unexpected constant violation (${ref.type}): ${codePreview(ref.node)}`,
      );
    }
  });

  binding.scope.removeOwnBinding(binding.identifier.name);
  binding.scope.bindings[newName] = binding;
  binding.identifier.name = newName;
}

export function renameParameters(
  path: NodePath<t.Function>,
  newNames: string[],
): void {
  const params = path.node.params as t.Identifier[];
  for (let i = 0; i < Math.min(params.length, newNames.length); i++) {
    const binding = path.scope.getBinding(params[i].name)!;
    renameFast(binding, newNames[i]);
  }
}
