import { statement } from '@babel/template';
import type { NodePath } from '@babel/traverse';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { constMemberExpression, findPath, renameFast } from '../../ast-utils';
import type { WebpackModule } from './module';

const buildNamespaceImport = statement`import * as NAME from "PATH";`;
const buildNamedExportLet = statement`export let NAME = VALUE;`;

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
export function convertESM(module: WebpackModule): void {
  // E.g. require.r(exports);
  const defineEsModuleMatcher = m.expressionStatement(
    m.callExpression(constMemberExpression('require', 'r'), [m.identifier()]),
  );

  const exportsName = m.capture(m.identifier());
  const exportedName = m.capture(m.anyString());
  const returnedValue = m.capture(m.anyExpression());
  // E.g. require.d(exports, "counter", function () { return f });
  const defineExportMatcher = m.expressionStatement(
    m.callExpression(constMemberExpression('require', 'd'), [
      exportsName,
      m.stringLiteral(exportedName),
      m.functionExpression(
        undefined,
        [],
        m.blockStatement([m.returnStatement(returnedValue)]),
      ),
    ]),
  );

  const emptyObjectVarMatcher = m.variableDeclarator(
    m.fromCapture(exportsName),
    m.objectExpression([]),
  );

  const properties = m.capture(
    m.arrayOf(
      m.objectProperty(
        m.identifier(),
        m.arrowFunctionExpression([], m.anyExpression()),
      ),
    ),
  );
  // E.g. require.d(exports, { foo: () => a, bar: () => b });
  const defineExportsMatcher = m.expressionStatement(
    m.callExpression(constMemberExpression('require', 'd'), [
      exportsName,
      m.objectExpression(properties),
    ]),
  );

  // E.g. const lib = require("./lib.js");
  const requireVariable = m.capture(m.identifier());
  const requiredModuleId = m.capture(m.anyNumber());
  const requireMatcher = m.variableDeclaration(undefined, [
    m.variableDeclarator(
      requireVariable,
      m.callExpression(m.identifier('require'), [
        m.numericLiteral(requiredModuleId),
      ]),
    ),
  ]);

  // module = require.hmd(module);
  const hmdMatcher = m.expressionStatement(
    m.assignmentExpression(
      '=',
      m.identifier('module'),
      m.callExpression(constMemberExpression('require', 'hmd')),
    ),
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
          buildNamespaceImport({
            NAME: requireVariable.current,
            PATH: String(requiredModuleId.current),
          }),
        );
      } else if (defineExportsMatcher.match(path.node)) {
        const exportsBinding = path.scope.getBinding(exportsName.current!.name);
        const emptyObject = emptyObjectVarMatcher.match(
          exportsBinding?.path.node,
        )
          ? (exportsBinding?.path.node.init as t.ObjectExpression)
          : null;

        for (const property of properties.current!) {
          const exportedKey = property.key as t.Identifier;
          const returnedValue = (property.value as t.ArrowFunctionExpression)
            .body as t.Expression;
          if (emptyObject) {
            emptyObject.properties.push(
              t.objectProperty(exportedKey, returnedValue),
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
  exportName: string,
) {
  if (value.type === 'Identifier') {
    const binding = requireDPath.scope.getBinding(value.name);
    if (!binding) return;

    const declaration = findPath(
      binding.path,
      m.or(
        m.variableDeclaration(),
        m.classDeclaration(),
        m.functionDeclaration(),
      ),
    );
    if (!declaration) return;

    if (exportName === 'default') {
      // `let f = 1;` -> `export default 1;`
      declaration.replaceWith(
        t.exportDefaultDeclaration(
          t.isVariableDeclaration(declaration.node)
            ? declaration.node.declarations[0].init!
            : declaration.node,
        ),
      );
    } else {
      // `let f = 1;` -> `export let counter = 1;`
      renameFast(binding, exportName);
      declaration.replaceWith(t.exportNamedDeclaration(declaration.node));
    }
  } else if (exportName === 'default') {
    requireDPath.insertAfter(t.exportDefaultDeclaration(value));
  } else {
    requireDPath.insertAfter(
      buildNamedExportLet({ NAME: t.identifier(exportName), VALUE: value }),
    );
  }
}
