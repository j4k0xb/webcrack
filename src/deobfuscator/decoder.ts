import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { StringArray } from './stringArray';

interface Decoder {
  path: NodePath<t.FunctionDeclaration>;
  references: NodePath[];
  name: string;
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
          // var h = array[e]; return h;
          // or return array[e -= 254];
          m.containerOf(
            m.memberExpression(
              m.identifier(m.fromCapture(arrayName)),
              m.anything()
            )
          )
        )
      )
    );
    if (matcher.match(decoderFn.node)) {
      const references =
        decoderFn.parentPath.scope.bindings[functionName.current!]
          .referencePaths;
      return {
        path: decoderFn,
        references,
        name: functionName.current!,
      };
    }
  }
}
