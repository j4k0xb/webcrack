import traverse, { NodePath, Scope } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { constMemberExpression } from '../../utils/matcher';
import { renameFast } from '../../utils/rename';
import { Module } from '../module';

/**
 * ```js
 * require.r(exports);
 * require.d(exports, 'counter', function () {
 *   return f;
 * });
 * let f = 1;
 * ```
 * ->
 * ```js
 * export let counter = 1;
 * ```
 */
export function convertESM(module: Module) {
  // E.g. require.r(exports);
  const defineEsModuleMatcher = m.expressionStatement(
    m.callExpression(constMemberExpression(m.identifier('require'), 'r'), [
      m.identifier(),
    ])
  );

  const exportedName = m.capture(m.anyString());
  const returnedName = m.capture(m.anyString());
  // E.g. require.d(exports, "counter", function () { return f });
  const defineExportMatcher = m.expressionStatement(
    m.callExpression(constMemberExpression(m.identifier('require'), 'd'), [
      m.identifier(),
      m.stringLiteral(exportedName),
      m.functionExpression(
        undefined,
        [],
        m.blockStatement([m.returnStatement(m.identifier(returnedName))])
      ),
    ])
  );

  const properties = m.capture(
    m.arrayOf(
      m.objectProperty(
        m.identifier(),
        m.arrowFunctionExpression([], m.identifier())
      )
    )
  );
  // E.g. require.d(exports, { foo: () => a, bar: () => b });
  const defineExportsMatcher = m.expressionStatement(
    m.callExpression(constMemberExpression(m.identifier('require'), 'd'), [
      m.identifier('exports'),
      m.objectExpression(properties),
    ])
  );

  traverse(module.ast, {
    enter(path) {
      // Only traverse the top-level
      if (path.parentPath?.parentPath) return path.skip();

      if (defineEsModuleMatcher.match(path.node)) {
        module.ast.program.sourceType = 'module';
        path.remove();
        return;
      }

      if (defineExportsMatcher.match(path.node)) {
        for (const property of properties.current!) {
          const exportName = (property.key as t.Identifier).name;
          const returnedName = ((property.value as t.ArrowFunctionExpression).body as t.Identifier).name;
          exportVariable(path.scope, returnedName, exportName);
        }
        path.remove();
      } else if (defineExportMatcher.match(path.node)) {
        exportVariable(
          path.scope,
          returnedName.current!,
          exportedName.current!
        );
        path.remove();
      }
    },
  });
}

function exportVariable(scope: Scope, varName: string, exportName: string) {
  const binding = scope.getBinding(varName);
  if (!binding) return;

  const declaration = binding.path.find(path =>
    path.isDeclaration()
  ) as NodePath<
    t.VariableDeclaration | t.ClassDeclaration | t.FunctionDeclaration
  > | null;
  if (!declaration) return;

  if (exportName === 'default') {
    // `let f = 1;` -> `export default 1;`
    declaration.replaceWith(
      t.exportDefaultDeclaration(
        t.isVariableDeclaration(declaration.node)
          ? declaration.node.declarations[0].init!
          : declaration.node
      )
    );
  } else {
    // `let f = 1;` -> `export let counter = 1;`
    renameFast(binding, exportName);
    declaration.replaceWith(t.exportNamedDeclaration(declaration.node));
  }
}
