import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { StringArray } from './stringArray';

export class Decoder {
  name: string;

  constructor(public path: NodePath<t.FunctionDeclaration>) {
    this.name = path.node.id!.name;
  }

  /**
   * replaces all references to `var e = decode;` with `decode`
   */
  inlineAliasVars() {
    // TODO: improve performance
    while (true) {
      this.path.parentPath.scope.crawl();
      const references =
        this.path.parentPath.scope.bindings[this.name].referencePaths;

      let changes = 0;
      for (const path of references) {
        const varName = m.capture(m.anyString());
        const matcher = m.variableDeclarator(
          m.identifier(varName),
          m.identifier(this.name)
        );
        if (matcher.match(path.parent)) {
          path.parentPath!.scope.rename(varName.current!, this.name);
          // remove the var declaration
          path.parentPath!.parentPath!.remove();
          changes++;
        }
      }
      if (changes === 0) return;
    }
  }
}

export function findDecoder(stringArray: StringArray): Decoder | undefined {
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
      decoderFn.parentPath.scope.rename(decoderFn.node.id!.name, '__DECODE__');
      return new Decoder(decoderFn);
    }
  }
}
