import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { StringArray } from './stringArray';

export class Decoder {
  name: string;

  constructor(public path: NodePath<t.FunctionDeclaration>) {
    this.name = path.node.id!.name;
  }

  get references() {
    return this.path.parentPath.scope.bindings[this.name].referencePaths;
  }

  /**
   * Replaces all references to `var alias = decode;` with `decode`
   */
  inlineAliasVars() {
    const references = [...this.references];

    for (const ref of references) {
      const varName = m.capture(m.anyString());
      const matcher = m.variableDeclarator(
        m.identifier(varName),
        m.identifier(this.name)
      );

      if (matcher.match(ref.parent)) {
        // Check all further assignments to that variable (`var anotherAlias = alias;`)
        references.push(
          ...ref.parentPath!.scope.bindings[varName.current!].referencePaths
        );
        ref.parentPath!.scope.rename(varName.current!, this.name);
        // remove the var declaration
        ref.parentPath!.parentPath!.remove();
      }
    }
  }
}

export function findDecoders(stringArray: StringArray): Decoder[] {
  const decoders: Decoder[] = [];

  for (const path of stringArray.references) {
    const decoderFn = path.findParent(p =>
      p.isFunctionDeclaration()
    ) as NodePath<t.FunctionDeclaration> | null;
    if (!decoderFn) continue;

    const functionName = m.capture(m.anyString());
    const arrayName = m.capture(m.anyString());
    const matcher = m.functionDeclaration(
      m.identifier(functionName),
      m.anything(),
      m.blockStatement(
        m.anyList(
          // var array = getStringArray();
          m.variableDeclaration(undefined, [
            m.variableDeclarator(
              m.identifier(arrayName),
              m.callExpression(m.identifier(stringArray.name))
            ),
          ]),
          m.zeroOrMore(),
          // var h = array[e]; return h;
          // or return array[e -= 254];
          m.containerOf(
            m.memberExpression(
              m.identifier(m.fromCapture(arrayName)),
              m.anything()
            )
          ),
          m.zeroOrMore()
        )
      )
    );
    if (matcher.match(decoderFn.node)) {
      decoderFn.parentPath.scope.rename(
        decoderFn.node.id!.name,
        `__DECODE_${decoders.length}__`
      );
      decoders.push(new Decoder(decoderFn));
    }
  }
  return decoders;
}
