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
    const references = [
      ...decoder.parentPath.scope.bindings[decoderName].referencePaths,
    ];

    for (const ref of references) {
      const varName = m.capture(m.anyString());
      const matcher = m.variableDeclarator(
        m.identifier(varName),
        m.identifier(decoderName)
      );

      if (matcher.match(ref.parent)) {
        // Check all further assignments to that variable (`var anotherAlias = alias;`)
        references.push(
          ...ref.parentPath!.scope.bindings[varName.current!].referencePaths
        );
        ref.parentPath!.scope.rename(varName.current!, decoderName);
        // remove the var declaration
        ref.parentPath!.parentPath!.remove();
        state.changes++;
      }
    }
  },
} satisfies Transform<NodePath<t.FunctionDeclaration>>;
