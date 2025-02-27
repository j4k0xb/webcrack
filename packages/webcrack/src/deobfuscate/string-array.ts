import type { NodePath } from '@babel/traverse';
import traverse from '@babel/traverse';
import type * as t from '@babel/types';
import * as m from '@codemod/matchers';
import {
  inlineArrayElements,
  isReadonlyObject,
  renameFast,
  undefinedMatcher,
} from '../ast-utils';

export interface StringArray {
  path: NodePath<t.FunctionDeclaration>;
  references: NodePath[];
  name: string;
  originalName: string;
  length: number;
}

export function findStringArray(ast: t.Node): StringArray | undefined {
  let result: StringArray | undefined;
  const functionName = m.capture(m.anyString());
  const arrayIdentifier = m.capture(m.identifier());
  const arrayExpression = m.capture(
    m.arrayExpression(m.arrayOf(m.or(m.stringLiteral(), undefinedMatcher))),
  );
  // getStringArray = function () { return array; };
  const functionAssignment = m.assignmentExpression(
    '=',
    m.identifier(m.fromCapture(functionName)),
    m.functionExpression(
      undefined,
      [],
      m.blockStatement([m.returnStatement(m.fromCapture(arrayIdentifier))]),
    ),
  );
  const variableDeclaration = m.variableDeclaration(undefined, [
    m.variableDeclarator(arrayIdentifier, arrayExpression),
  ]);
  // function getStringArray() { ... }
  const matcher = m.functionDeclaration(
    m.identifier(functionName),
    [],
    m.or(
      // var array = ["hello", "world"];
      // return (getStringArray = function () { return array; })();
      m.blockStatement([
        variableDeclaration,
        m.returnStatement(m.callExpression(functionAssignment)),
      ]),
      // var array = ["hello", "world"];
      // getStringArray = function () { return array; });
      // return getStringArray();
      m.blockStatement([
        variableDeclaration,
        m.expressionStatement(functionAssignment),
        m.returnStatement(m.callExpression(m.identifier(functionName))),
      ]),
    ),
  );

  traverse(ast, {
    // Wrapped string array from later javascript-obfuscator versions
    FunctionDeclaration(path) {
      if (matcher.match(path.node)) {
        const length = arrayExpression.current!.elements.length;
        const name = functionName.current!;
        const binding = path.scope.getBinding(name)!;
        renameFast(binding, '__STRING_ARRAY__');

        result = {
          path,
          references: binding.referencePaths,
          originalName: name,
          name: '__STRING_ARRAY__',
          length,
        };
        path.stop();
      }
    },
    // Simple string array inlining (only `array[0]`, `array[1]` etc references, no rotating/decoding).
    // May be used by older or different obfuscators
    VariableDeclaration(path) {
      if (!variableDeclaration.match(path.node)) return;

      const length = arrayExpression.current!.elements.length;
      const binding = path.scope.getBinding(arrayIdentifier.current!.name)!;
      const memberAccess = m.memberExpression(
        m.fromCapture(arrayIdentifier),
        m.numericLiteral(m.matcher((value) => value < length)),
      );
      if (!binding.referenced || !isReadonlyObject(binding, memberAccess))
        return;

      inlineArrayElements(arrayExpression.current!, binding.referencePaths);
      path.remove();
    },
  });

  return result;
}
