import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';

export interface StringArray {
  path: NodePath<t.FunctionDeclaration>;
  references: NodePath[];
  name: string;
  length: number;
}

export function findStringArray(ast: t.Node): StringArray | undefined {
  let result: StringArray | undefined;
  const functionName = m.capture(m.anyString());
  const arrayIdentifier = m.capture(m.identifier());
  const arrayExpression = m.capture(
    m.arrayExpression(m.arrayOf(m.stringLiteral()))
  );
  // getStringArray = function () { return n; };
  const functionAssignment = m.assignmentExpression(
    '=',
    m.identifier(m.fromCapture(functionName)),
    m.functionExpression(
      undefined,
      [],
      m.blockStatement([m.returnStatement(m.fromCapture(arrayIdentifier))])
    )
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
      // getStringArray = function () { return n; });
      // return getStringArray();
      m.blockStatement([
        variableDeclaration,
        m.expressionStatement(functionAssignment),
        m.returnStatement(m.callExpression(m.identifier(functionName))),
      ])
    )
  );

  traverse(ast, {
    FunctionDeclaration(path) {
      if (matcher.match(path.node)) {
        const length = arrayExpression.current!.elements.length;
        const name = functionName.current!;
        const binding = path.parentPath.scope.getBinding(name)!;

        path.parentPath.scope.rename(name, '__STRING_ARRAY__');
        result = {
          path,
          references: binding.referencePaths,
          name: '__STRING_ARRAY__',
          length,
        };
        path.stop();
      }
    },
  });

  return result;
}
