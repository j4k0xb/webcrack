import { Binding } from '@babel/traverse';

/**
 * Warning: doesn't update the scope data structures.
 */
export function fastRename(binding: Binding, newName: string) {
  binding.referencePaths.forEach(ref => {
    if (ref.isIdentifier()) ref.node.name = newName!;
  });
  binding.identifier.name = newName;
}
