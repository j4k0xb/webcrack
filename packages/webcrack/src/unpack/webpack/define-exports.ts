import { statement } from '@babel/template';
import { Binding, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import {
  Transform,
  constMemberExpression,
  findPath,
  renameFast,
} from '../../ast-utils';

// TODO: hoist re-exports to the top of the file (but retain order relative to imports)
// TODO: merge re-exports

/**
 * webpack/runtime/define property getters
 * ```js
 * 	__webpack_require__.d = (exports, definition) => {
 * 		for (var key in definition) {
 * 			if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
 * 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
 * 			}
 * 		}
 * 	};
 * ```
 */
export default {
  name: 'define-exports',
  tags: ['unsafe'],
  scope: true,
  visitor() {
    const exportName = m.capture(m.anyString());
    const returnValue = m.capture(m.anyExpression());
    const getter = m.or(
      m.functionExpression(
        undefined,
        [],
        m.blockStatement([m.returnStatement(returnValue)]),
      ),
      m.arrowFunctionExpression([], returnValue),
    );
    // Example (webpack v4): __webpack_require__.d(exports, 'counter', function () { return local });
    const singleExport = m.expressionStatement(
      m.callExpression(constMemberExpression('__webpack_require__', 'd'), [
        m.identifier(),
        m.stringLiteral(exportName),
        getter,
      ]),
    );

    const defaultExpressionExport = m.expressionStatement(
      m.assignmentExpression(
        '=',
        constMemberExpression('exports', 'default'),
        returnValue,
      ),
    );

    const objectProperty = m.objectProperty(m.identifier(exportName), getter);
    const properties = m.capture(m.arrayOf(objectProperty));
    // Example (webpack v5): __webpack_require__.d(exports, { a: () => b, c: () => d });
    const multiExport = m.expressionStatement(
      m.callExpression(constMemberExpression('__webpack_require__', 'd'), [
        m.identifier(),
        m.objectExpression(properties),
      ]),
    );

    return {
      ExpressionStatement(path) {
        if (!path.parentPath.isProgram()) return path.skip();

        if (singleExport.match(path.node)) {
          addExport(path, exportName.current!, returnValue.current!);
          path.remove();
          this.changes++;
        } else if (defaultExpressionExport.match(path.node)) {
          path.replaceWith(t.exportDefaultDeclaration(returnValue.current!));
          this.changes++;
        } else if (multiExport.match(path.node)) {
          for (const property of properties.current!) {
            objectProperty.match(property); // To easily get the captures per property
            addExport(path, exportName.current!, returnValue.current!);
          }
          path.remove();
          this.changes++;
        }
      },
    };
  },
} satisfies Transform;

function addExport(path: NodePath, exportName: string, value: t.Expression) {
  const object = m.capture(m.identifier());
  const property = m.capture(m.identifier());
  const memberValue = m.memberExpression(object, property);

  if (t.isIdentifier(value)) {
    const binding = path.scope.getBinding(value.name);
    if (!binding) return;

    if (exportName === 'default') {
      exportDefault(binding);
    } else {
      exportNamed(binding, exportName);
    }
  } else if (memberValue.match(value)) {
    const binding = path.scope.getBinding(object.current!.name);
    if (!binding) return;

    const localName = property.current!.name;
    reExportNamed(binding, exportName, localName);
  }
}

/**
 * ```diff
 * - __webpack_require__.d(exports, 'counter', () => local);
 * - let local = 1;
 * + export let counter = 1;
 * ```
 */
function exportNamed(binding: Binding, exportName: string): void {
  const declaration = findPath(
    binding.path,
    m.or(
      m.variableDeclaration(),
      m.classDeclaration(),
      m.functionDeclaration(),
    ),
  );
  if (!declaration) return;

  renameFast(binding, exportName);
  declaration.replaceWith(t.exportNamedDeclaration(declaration.node));
}

/**
 * ```diff
 * - __webpack_require__.d(exports, 'default', () => local);
 * - let local = 1;
 * + export default 1;
 * ```
 */
function exportDefault(binding: Binding) {
  const declaration = findPath(
    binding.path,
    m.or(
      m.variableDeclaration(),
      m.functionDeclaration(),
      m.classDeclaration(),
    ),
  );
  if (!declaration) return;

  if (binding.references > 1) {
    declaration.insertAfter(
      statement`export { ${binding.identifier} as default };`(),
    );
  } else {
    declaration.replaceWith(
      t.exportDefaultDeclaration(
        t.isVariableDeclaration(declaration.node)
          ? declaration.node.declarations[0].init!
          : declaration.node,
      ),
    );
  }
}

/**
 * ```diff
 * - __webpack_require__.d(exports, 'readFile', () => fs.readFile);
 * - var fs = __webpack_require__('fs');
 * + export { readFile } from 'fs';
 * ```
 * alias:
 * ```diff
 * - __webpack_require__.d(exports, 'foo', () => fs.readFile);
 * - var fs = __webpack_require__('fs');
 * + export { readFile as foo } from 'fs';
 * ```
 */
function reExportNamed(
  binding: Binding,
  exportName: string,
  localName: string,
) {
  const moduleId = m.capture(m.or(m.numericLiteral(), m.stringLiteral()));
  const variableMatcher = m.variableDeclaration(undefined, [
    m.variableDeclarator(
      m.identifier(binding.identifier.name),
      m.callExpression(m.identifier('__webpack_require__'), [moduleId]),
    ),
  ]);

  if (variableMatcher.match(binding.path.parent)) {
    const modulePath = String(moduleId.current!.value);
    // FIXME: does this mess up the imports references in webpack/module.ts?
    binding.path.parentPath!.insertBefore(
      statement`export { ${localName} as ${exportName} } from "${modulePath}";`(),
    );
    // FIXME: only remove at the end to account for multiple re-exports/references
    if (binding.references === 1) {
      binding.path.parentPath!.remove();
    }
  }
}
