import type { Transform } from '../ast-utils';
import { inlineFunctionAliases, inlineVariableAliases } from '../ast-utils';
import type { Decoder } from './decoder.js';

/**
 * Replaces all references to `var alias = decode;` with `decode`
 */
export default {
  name: 'inline-decoder-wrappers',
  tags: ['unsafe'],
  scope: true,
  run(ast, state, decoder) {
    if (!decoder) return;
    const decoderBinding = decoder.path.parentPath.scope.getBinding(
      decoder.name,
    );
    if (decoderBinding) {
      state.changes += inlineVariableAliases(decoderBinding).changes;
      state.changes += inlineFunctionAliases(decoderBinding).changes; // FIXME: may be var = function(){}
    }
  },
} satisfies Transform<Decoder>;
