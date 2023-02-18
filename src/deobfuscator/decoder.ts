import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { StringArray } from './stringArray';

export interface Decoder {
  name: string;
  path: NodePath<t.FunctionDeclaration>;
}

export function findDecoders(stringArray: StringArray): Decoder[] {
  const decoders: Decoder[] = [];

  for (const ref of stringArray.references) {
    const decoderFn = ref.findParent(p =>
      p.isFunctionDeclaration()
    ) as NodePath<t.FunctionDeclaration> | null;
    if (!decoderFn) continue;

    const functionName = m.capture(m.anyString());
    const arrayIdentifier = m.capture(m.identifier());
    const matcher = m.functionDeclaration(
      m.identifier(functionName),
      m.anything(),
      m.blockStatement(
        m.anyList(
          // var array = getStringArray();
          m.variableDeclaration(undefined, [
            m.variableDeclarator(
              arrayIdentifier,
              m.callExpression(m.identifier(stringArray.name))
            ),
          ]),
          m.zeroOrMore(),
          // var h = array[e]; return h;
          // or return array[e -= 254];
          m.containerOf(
            m.memberExpression(m.fromCapture(arrayIdentifier), m.anything())
          ),
          m.zeroOrMore()
        )
      )
    );
    if (matcher.match(decoderFn.node)) {
      const oldName = functionName.current!;
      const newName = `__DECODE_${decoders.length}__`;
      decoderFn.parentPath.scope.rename(oldName, newName);
      decoders.push({ name: newName, path: decoderFn });
    }
  }
  return decoders;
}
