import { expression } from '@babel/template';
import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import * as m from '@codemod/matchers';
import {
  anySubList,
  declarationOrAssignment,
  findParent,
  inlineVariable,
  renameFast,
} from '../ast-utils';
import type { StringArray } from './string-array';

/**
 * A function that is called with >= 1 numeric/string arguments
 * and returns a string from the string array. It may also decode
 * the string with Base64 or RC4.
 */
export class Decoder {
  originalName: string;
  name: string;
  path: NodePath<t.FunctionDeclaration>;

  constructor(
    originalName: string,
    name: string,
    path: NodePath<t.FunctionDeclaration>,
  ) {
    this.originalName = originalName;
    this.name = name;
    this.path = path;
  }

  collectCalls(): NodePath<t.CallExpression>[] {
    const calls: NodePath<t.CallExpression>[] = [];

    const literalArgument: m.Matcher<t.Expression> = m.or(
      m.binaryExpression(
        m.anything(),
        m.matcher((node) => literalArgument.match(node)),
        m.matcher((node) => literalArgument.match(node)),
      ),
      m.unaryExpression(
        '-',
        m.matcher((node) => literalArgument.match(node)),
      ),
      m.numericLiteral(),
      m.stringLiteral(),
    );

    const literalCall = m.callExpression(
      m.identifier(this.name),
      m.arrayOf(literalArgument),
    );
    const expressionCall = m.callExpression(
      m.identifier(this.name),
      m.arrayOf(m.anyExpression()),
    );

    const conditional = m.capture(m.conditionalExpression());
    const conditionalCall = m.callExpression(m.identifier(this.name), [
      conditional,
    ]);

    const buildExtractedConditional = expression`TEST ? CALLEE(CONSEQUENT) : CALLEE(ALTERNATE)`;

    const binding = this.path.scope.getBinding(this.name)!;
    for (const ref of binding.referencePaths) {
      if (conditionalCall.match(ref.parent)) {
        // decode(test ? 1 : 2) -> test ? decode(1) : decode(2)
        const [replacement] = ref.parentPath!.replaceWith(
          buildExtractedConditional({
            TEST: conditional.current!.test,
            CALLEE: ref.parent.callee,
            CONSEQUENT: conditional.current!.consequent,
            ALTERNATE: conditional.current!.alternate,
          }),
        );
        // some of the scope information is somehow lost after replacing
        replacement.scope.crawl();
      } else if (literalCall.match(ref.parent)) {
        calls.push(ref.parentPath as NodePath<t.CallExpression>);
      } else if (expressionCall.match(ref.parent)) {
        // var n = 1; decode(n); -> decode(1);
        ref.parentPath!.traverse({
          ReferencedIdentifier(path) {
            const varBinding = path.scope.getBinding(path.node.name)!;
            if (!varBinding) return;
            inlineVariable(varBinding, literalArgument, true);
          },
        });
        if (literalCall.match(ref.parent)) {
          calls.push(ref.parentPath as NodePath<t.CallExpression>);
        }
      } else if (ref.parentPath?.isExpressionStatement()) {
        // `decode;` may appear on it's own in some forked obfuscators
        ref.parentPath.remove();
      }
    }

    return calls;
  }
}

export function findDecoders(stringArray: StringArray): Decoder[] {
  const decoders: Decoder[] = [];

  const functionName = m.capture(m.anyString());
  const arrayIdentifier = m.capture(m.identifier());
  const matcher = m.functionDeclaration(
    m.identifier(functionName),
    m.anything(),
    m.blockStatement(
      anySubList(
        // var array = getStringArray();
        declarationOrAssignment(
          arrayIdentifier,
          m.callExpression(m.identifier(stringArray.name)),
        ),
        // var h = array[e]; return h;
        // or return array[e -= 254];
        m.containerOf(
          m.memberExpression(m.fromCapture(arrayIdentifier), undefined, true),
        ),
      ),
    ),
  );

  for (const ref of stringArray.references) {
    const decoderFn = findParent(ref, matcher);

    if (decoderFn) {
      const oldName = functionName.current!;
      const newName = `__DECODE_${decoders.length}__`;
      const binding = decoderFn.scope.getBinding(oldName)!;
      renameFast(binding, newName);
      decoders.push(new Decoder(oldName, newName, decoderFn));
    }
  }

  return decoders;
}
