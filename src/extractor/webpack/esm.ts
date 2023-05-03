import { statement } from '@babel/template';
import traverse, { NodePath } from '@babel/traverse';
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

  const exportsName = m.capture(m.identifier());
  const exportedName = m.capture(m.anyString());
  const returnedValue = m.capture(m.anyExpression());
  // E.g. require.d(exports, "counter", function () { return f });
  const defineExportMatcher = m.expressionStatement(
    m.callExpression(constMemberExpression(m.identifier('require'), 'd'), [
      exportsName,
      m.stringLiteral(exportedName),
      m.functionExpression(
        undefined,
        [],
        m.blockStatement([m.returnStatement(returnedValue)])
      ),
    ])
  );

  const emptyObjectVarMatcher = m.variableDeclarator(
    m.fromCapture(exportsName),
    m.objectExpression([])
  );

  const properties = m.capture(
    m.arrayOf(
      m.objectProperty(
        m.identifier(),
        m.arrowFunctionExpression([], m.anyExpression())
      )
    )
  );
  // E.g. require.d(exports, { foo: () => a, bar: () => b });
  const defineExportsMatcher = m.expressionStatement(
    m.callExpression(constMemberExpression(m.identifier('require'), 'd'), [
      exportsName,
      m.objectExpression(properties),
    ])
  );

  // E.g. const lib = require("./lib.js");
  const requireVariable = m.capture(m.identifier());
  const requiredModuleId = m.capture(m.anyNumber());
  const requireMatcher = m.variableDeclaration(undefined, [
    m.variableDeclarator(
      requireVariable,
      m.callExpression(m.identifier('require'), [
        m.numericLiteral(requiredModuleId),
      ])
    ),
  ]);

  // module = require.hmd(module);
  const hmdMatcher = m.expressionStatement(
    m.assignmentExpression(
      '=',
      m.identifier('module'),
      m.callExpression(constMemberExpression(m.identifier('require'), 'hmd'))
    )
  );

  traverse(module.ast, {
    enter(path) {
      // Only traverse the top-level
      if (path.parentPath?.parentPath) return path.skip();

      if (defineEsModuleMatcher.match(path.node)) {
        module.ast.program.sourceType = 'module';
        path.remove();
      } else if (
        module.ast.program.sourceType === 'module' &&
        requireMatcher.match(path.node)
      ) {
        path.replaceWith(
          statement`import * as ${requireVariable.current} from "${String(
            requiredModuleId.current
          )}";`()
        );
      } else if (defineExportsMatcher.match(path.node)) {
        const exportsBinding = path.scope.getBinding(exportsName.current!.name);
        const emptyObject = emptyObjectVarMatcher.match(
          exportsBinding?.path.node
        )
          ? (exportsBinding!.path.node.init as t.ObjectExpression)
          : null;

        for (const property of properties.current!) {
          const exportedKey = property.key as t.Identifier;
          const returnedValue = (property.value as t.ArrowFunctionExpression)
            .body as t.Expression;
          if (emptyObject) {
            emptyObject.properties.push(
              t.objectProperty(exportedKey, returnedValue)
            );
          } else {
            exportVariable(path, returnedValue, exportedKey.name);
          }
        }

        path.remove();
      } else if (defineExportMatcher.match(path.node)) {
        exportVariable(path, returnedValue.current!, exportedName.current!);
        path.remove();
      } else if (hmdMatcher.match(path.node)) {
        path.remove();
      }
    },
  });
}

function exportVariable(
  requireDPath: NodePath,
  value: t.Expression,
  exportName: string
) {
  if (value.type === 'Identifier') {
    const binding = requireDPath.scope.getBinding(value.name);
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
  } else {
    if (exportName === 'default') {
      requireDPath.insertAfter(statement`export default ${value}`());
    } else {
      requireDPath.insertAfter(
        statement`export let ${exportName} = ${value}`()
      );
    }
  }
}
