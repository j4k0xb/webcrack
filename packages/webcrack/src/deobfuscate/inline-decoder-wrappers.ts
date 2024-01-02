import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import type { Transform } from '../ast-utils';
import { inlineFunctionAliases, inlineVariableAliases } from '../ast-utils';

/**
 * Replaces all references to `var alias = decode;` with `decode`
 */
export default {
  name: 'inline-decoder-wrappers',
  tags: ['unsafe'],
  scope: true,
  run(ast, state, decoder) {
    if (!decoder?.node.id) return;

    const decoderName = decoder.node.id.name;
    const decoderBinding = decoder.parentPath.scope.getBinding(decoderName);
    if (decoderBinding) {
      state.changes += inlineVariableAliases(decoderBinding).changes;
      state.changes += inlineFunctionAliases(decoderBinding).changes;
    }
  },
} satisfies Transform<NodePath<t.FunctionDeclaration>>;
