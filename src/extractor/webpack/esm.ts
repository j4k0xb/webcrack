import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { fastRename as renameFast } from '../../utils/rename';
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
  traverse(module.ast, {
    enter(path) {
      // Only traverse the top-level
      if (path.parentPath?.parentPath) return path.skip();

      if (defineEsModuleMatcher.match(path.node)) {
        module.ast.program.sourceType = 'module';
        path.remove();
        return;
      }

      if (defineExportMatcher.match(path.node)) {
        const binding = path.scope.getBinding(returnedName.current!);
        if (!binding) return;

        const declaration = binding.path.find(path =>
          path.isDeclaration()
        ) as NodePath<
          t.VariableDeclaration | t.ClassDeclaration | t.FunctionDeclaration
        > | null;
        if (!declaration) return;

        if (exportedName.current === 'default') {
          // `let f = 1;` -> `export default 1;`
          declaration.replaceWith(
            t.exportDefaultDeclaration(
              t.isVariableDeclaration(declaration.node)
                ? declaration.node.declarations[0].init!
                : declaration.node
            )
          );
        } else {
          // In case there's a collision with an existing binding
          path.scope.rename(exportedName.current!);

          // `let f = 1;` -> `default let counter = 1;`
          renameFast(binding, exportedName.current!);
          declaration.replaceWith(t.exportNamedDeclaration(declaration.node));
        }

        path.remove();
      }
    },
  });
}

// require.r(exports);
const defineEsModuleMatcher = m.expressionStatement(
  m.callExpression(
    m.memberExpression(m.identifier('require'), m.identifier('r')),
    [m.identifier('exports')]
  )
);

const exportedName = m.capture(m.anyString());
const returnedName = m.capture(m.anyString());
// E.g. require.d(exports, "counter", function () { return f });
const defineExportMatcher = m.expressionStatement(
  m.callExpression(
    m.memberExpression(m.identifier('require'), m.identifier('d')),
    [
      m.identifier('exports'),
      m.stringLiteral(exportedName),
      m.functionExpression(
        undefined,
        [],
        m.blockStatement([m.returnStatement(m.identifier(returnedName))])
      ),
    ]
  )
);
