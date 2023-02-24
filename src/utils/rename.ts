import { Binding } from '@babel/traverse';
import * as t from '@babel/types';

export function renameFast(binding: Binding, newName: string) {
  binding.referencePaths.forEach(ref => {
    // To avoid conflicts with other bindings of the same name
    ref.scope.rename(newName);
    if (ref.isIdentifier()) ref.node.name = newName!;
  });
  // Also update assignments
  binding.constantViolations.forEach(ref => {
    ref.scope.rename(newName);
    if (ref.isAssignmentExpression() && t.isIdentifier(ref.node.left)) {
      ref.node.left.name = newName!;
    }
  });

  binding.scope.removeOwnBinding(binding.identifier.name);
  binding.scope.bindings[newName] = binding;
  binding.identifier.name = newName;
}
