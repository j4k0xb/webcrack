import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../transforms';

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

    for (const aliasRef of decoderBinding.referencePaths) {
      const varName = m.capture(m.anyString());
      const varMatcher = m.variableDeclarator(
        m.identifier(varName),
        m.identifier(decoderName)
      );

      if (varMatcher.match(aliasRef.parent)) {
        const scope = aliasRef.parentPath!.scope;

        // Update decoder references to keep it up to date because scope.rename doesn't do that
        const aliasRefs = scope.bindings[varName.current!].referencePaths;
        aliasRefs.forEach(ref => decoderBinding.reference(ref));
        scope.rename(varName.current!, decoderName);

        // Remove the alias var declaration
        aliasRef.parentPath!.parentPath!.remove();

        state.changes++;
        continue;
      }
        ref.parentPath!.scope.rename(varName.current!, decoderName);
        // remove the var declaration
        ref.parentPath!.parentPath!.remove();
        state.changes++;
      }
    }
  },
} satisfies Transform<NodePath<t.FunctionDeclaration>>;
