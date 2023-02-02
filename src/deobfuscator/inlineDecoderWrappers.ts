import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Transform } from '../transforms';
import { inlineFunctionAliases, inlineVariableAliases } from '../utils/ast';

/**
 * Replaces all references to `var alias = decode;` with `decode`
 */
export default {
  name: 'inlineDecoderWrappers',
  tags: ['unsafe'],
  run(ast, state, decoder) {
    if (!decoder || !decoder.node.id) return;

    const decoderName = decoder.node.id.name;
    const decoderBinding = decoder.parentPath.scope.bindings[decoderName];
    inlineVariableAliases(decoderBinding);
    inlineFunctionAliases(decoderBinding);
  },
} satisfies Transform<NodePath<t.FunctionDeclaration>>;
