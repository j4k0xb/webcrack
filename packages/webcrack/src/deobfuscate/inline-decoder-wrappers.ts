import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import {
  Transform,
  inlineFunctionAliases,
  inlineVariableAliases,
} from '../ast-utils';

/**
 * Replaces all references to `var alias = decode;` with `decode`
 */
export default {
  name: 'inlineDecoderWrappers',
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
