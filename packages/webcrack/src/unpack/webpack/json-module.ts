import traverse from '@babel/traverse';
import type * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { constKey, constMemberExpression } from '../../ast-utils';

/**
 * @returns The parsed JSON value if the AST is a JSON module, otherwise undefined.
 */
export function transformJsonModule(ast: t.File): unknown {
  const jsonValue = m.or(
    m.stringLiteral(),
    m.numericLiteral(),
    m.unaryExpression('-', m.numericLiteral()),
    m.booleanLiteral(),
    m.nullLiteral(),
    m.matcher<t.ObjectExpression | t.ArrayExpression>(
      (node) => jsonObject.match(node) || jsonArray.match(node),
    ),
  );
  const jsonObject = m.objectExpression(
    m.arrayOf(m.objectProperty(constKey(), jsonValue)),
  );
  const jsonArray = m.arrayExpression(m.arrayOf(jsonValue));
  const matcher = m.expressionStatement(
    m.assignmentExpression(
      '=',
      constMemberExpression('module', 'exports'),
      m.or(jsonObject, jsonArray),
    ),
  );

  if (ast.program.body.length === 1 && matcher.match(ast.program.body[0])) {
    let result: unknown;
    traverse(ast, {
      noScope: true,
      'ObjectExpression|ArrayExpression'(path) {
        result = path.evaluate().value;
        path.stop();
      },
    });
    return result;
  }
}
