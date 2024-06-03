import type { Binding } from '@babel/traverse';
import type * as t from '@babel/types';

/**
 * Remove a referencePath from a binding and decrement the amount of references.
 */
export function dereference(binding: Binding, reference: t.Node) {
  const index = binding.referencePaths.findIndex(
    (ref) => ref.node === reference,
  );
  if (index !== -1) {
    binding.referencePaths.splice(index, 1);
    binding.dereference();
  }
}
