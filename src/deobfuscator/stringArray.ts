import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';

interface StringArray {
  path: NodePath<t.FunctionDeclaration>;
  references: NodePath[];
  name: string;
  strings: string[];
}

export default (ast: t.Node) => {
  let result: StringArray | undefined;

  traverse(ast, {
    FunctionDeclaration(path) {
      if (matcher.match(path.node)) {
        const strings = array.current!.elements.map(
          e => (e as t.StringLiteral).value
        );
        const name = functionName.current!;
        path.parentPath.scope.crawl();
        let references = path.parentPath.scope.bindings[name].referencePaths;
        // Skip references in the same function
        references = references.filter(ref => !ref.findParent(p => p === path));
        result = { path, references, name, strings };
        path.stop();
      }
    },
    noScope: true,
  });

  return result;
};

const functionName = m.capture(m.anyString());
const arrayName = m.capture(m.anyString());
const array = m.capture(m.arrayExpression(m.arrayOf(m.stringLiteral())));
const functionAssignment = m.assignmentExpression(
  '=',
  m.identifier(m.fromCapture(functionName)),
  m.functionExpression(
    undefined,
    [],
    m.blockStatement([
      m.returnStatement(m.identifier(m.fromCapture(arrayName))),
    ])
  )
);
const variableDeclaration = m.variableDeclaration(undefined, [
  m.variableDeclarator(m.identifier(arrayName), array),
]);
const matcher = m.functionDeclaration(
  m.identifier(functionName),
  [],
  m.or(
    m.blockStatement([
      variableDeclaration,
      m.returnStatement(m.callExpression(functionAssignment)),
    ]),
    m.blockStatement([
      variableDeclaration,
      m.expressionStatement(functionAssignment),
      m.returnStatement(m.callExpression(m.identifier(functionName))),
    ])
  )
);
