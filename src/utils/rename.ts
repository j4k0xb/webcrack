import { Binding } from '@babel/traverse';

/**
 * Warning: only works when the reference is an identifier
 */
export function renameFast(binding: Binding, newName: string) {
  binding.referencePaths.forEach(ref => {
    // To avoid conflicts with other bindings of the same name
    ref.scope.rename(newName);
    if (ref.isIdentifier()) ref.node.name = newName!;
  });
  binding.scope.removeOwnBinding(binding.identifier.name);
  binding.scope.bindings[newName] = binding;
  binding.identifier.name = newName;
}
