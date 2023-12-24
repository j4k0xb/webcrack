import { statement } from '@babel/template';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { constMemberExpression, findPath, renameFast } from '../../ast-utils';
import { WebpackModule } from './module';

const buildNamespaceImport = statement`import * as NAME from "PATH";`;
const buildNamedImport = (locals: string[], imported: string[], path: string) =>
  t.importDeclaration(
    locals.map((local, i) =>
      t.importSpecifier(t.identifier(local), t.identifier(imported[i])),
    ),
    t.stringLiteral(path),
  );
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

  const exportsObjectName = m.capture(m.identifier());
  const exportedName = m.capture(m.anyString());
  const exportedLocal = m.capture(m.anyExpression());
  // E.g. require.d(exports, "counter", function () { return f });
  const defineExportMatcher = m.expressionStatement(
    m.callExpression(constMemberExpression('require', 'd'), [
      exportsObjectName,
      m.stringLiteral(exportedName),
      m.functionExpression(
        undefined,
        [],
        m.blockStatement([m.returnStatement(exportedLocal)]),
      ),
    ]),
  );
  const exportAssignment = m.expressionStatement(
    m.assignmentExpression(
      '=',
      m.memberExpression(
        m.identifier('exports'),
        m.identifier(exportedName),
        false,
      ),
      exportedLocal,
    ),
  );

  const emptyObjectVarMatcher = m.variableDeclarator(
    m.fromCapture(exportsObjectName),
    m.objectExpression([]),
  );

  const properties = m.capture(
    m.arrayOf(
      m.objectProperty(
        m.identifier(),
        m.or(
          m.arrowFunctionExpression([], m.anyExpression()),
          m.functionExpression(
            null,
            [],
            m.blockStatement([m.returnStatement()]),
          ),
        ),
      ),
    ),
  );
  // E.g. require.d(exports, { foo: () => a, bar: () => b });
  const defineExportsMatcher = m.expressionStatement(
    m.callExpression(constMemberExpression('require', 'd'), [
      exportsObjectName,
      m.objectExpression(properties),
    ]),
  );

  const requireVariable = m.capture(m.identifier());
  const requiredModuleId = m.capture(m.anyNumber());
  // E.g. const lib = require(1);
  const requireMatcher = m.variableDeclaration(undefined, [
    m.variableDeclarator(
      requireVariable,
      m.callExpression(m.identifier('require'), [
        m.numericLiteral(requiredModuleId),
      ]),
    ),
  ]);

  const zeroSequenceMatcher = m.sequenceExpression([
    m.numericLiteral(0),
    m.identifier(),
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
      } else if (requireMatcher.match(path.node)) {
        const binding = path.scope.getBinding(requireVariable.current!.name)!;
        const references = binding.referencePaths.map((p) => p.parentPath!);
        const validateReferences = (
          references: NodePath[],
        ): references is NodePath<
          t.MemberExpression & { property: t.Identifier }
        >[] =>
          references.every((p) =>
            m
              .memberExpression(
                m.fromCapture(requireVariable),
                m.identifier(),
                false,
              )
              .match(p.node),
          );
        if (!validateReferences(references)) {
          path.replaceWith(
            buildNamespaceImport({
              NAME: requireVariable.current,
              PATH: String(requiredModuleId.current),
            }),
          );
          return;
        }

        const importNames = [
          ...new Set(references.map((p) => p.node.property.name)),
        ];
        const localNames = importNames.map((name) => {
          const binding = path.scope.getBinding(name);
          const hasNameConflict = binding?.referencePaths.some(
            (p) => p.scope.getBinding(name) !== binding,
          );
          return hasNameConflict ? path.scope.generateUid(name) : name;
        });

        path.replaceWith(
          buildNamedImport(
            localNames,
            importNames,
            String(requiredModuleId.current),
          ),
        );

        [...references].forEach((ref) => {
          ref.replaceWith(ref.node.property);
          if (zeroSequenceMatcher.match(ref.parent)) {
            ref.parentPath.replaceWith(ref);
          }
        });
      } else if (defineExportsMatcher.match(path.node)) {
        const exportsBinding = path.scope.getBinding(
          exportsObjectName.current!.name,
        );
        const emptyObject = emptyObjectVarMatcher.match(
          exportsBinding?.path.node,
        )
          ? (exportsBinding?.path.node.init as t.ObjectExpression)
          : null;

        for (const property of properties.current!) {
          const exportedKey = property.key as t.Identifier;
          const returnedValue = t.isArrowFunctionExpression(property.value)
            ? (property.value.body as t.Expression)
            : ((
                (property.value as t.FunctionExpression).body
                  .body[0] as t.ReturnStatement
              ).argument as t.Expression);
          if (emptyObject) {
            emptyObject.properties.push(
              t.objectProperty(exportedKey, returnedValue),
            );
          } else {
            exportVariable(path, returnedValue, exportedKey.name);
          }
        }

        path.remove();
      } else if (exportAssignment.match(path.node)) {
        path.replaceWith(
          buildNamedExportLet({
            NAME: t.identifier(exportedName.current!),
            VALUE: exportedLocal.current!,
          }),
        );
      } else if (defineExportMatcher.match(path.node)) {
        exportVariable(path, exportedLocal.current!, exportedName.current!);
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
