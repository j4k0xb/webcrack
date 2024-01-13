import { statement } from '@babel/template';
import { NodePath } from '@babel/traverse';
import * as m from '@codemod/matchers';
import assert from 'assert';
import { Transform, constMemberExpression } from '../../../ast-utils';
import { ImportExportManager } from '../import-export-manager';

/**
 * `__webpack_require__.d` defines getters on the exports object. Used in ESM.
 *
 * When the [ModuleConcatenationPlugin](https://webpack.js.org/plugins/module-concatenation-plugin/)
 * is enabled, it can use a namespace object variable instead:
 * https://github.com/webpack/webpack/blob/dfffd6a241bf1d593b3fd31b4b279f96f4a4aab1/lib/optimize/ConcatenatedModule.js#L58
 *
 * It is very hard to separate concatenated modules again, so it will only transform the main module.
 */
export default {
  name: 'define-property-getters',
  tags: ['unsafe'],
  scope: true,
  visitor(manager) {
    assert(manager);

    const namespaceObject = m.capture(m.anyString());
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
    // Example (webpack v4): __webpack_require__.d(__webpack_exports__, 'counter', function () { return local });
    const singleExport = m.expressionStatement(
      m.callExpression(constMemberExpression('__webpack_require__', 'd'), [
        m.identifier(namespaceObject),
        m.stringLiteral(exportName),
        getter,
      ]),
    );

    // Example (webpack v4): __webpack_exports__.default = 1;
    const defaultExportAssignment = m.expressionStatement(
      m.assignmentExpression(
        '=',
        constMemberExpression('__webpack_exports__', 'default'),
        returnValue,
      ),
    );

    const objectProperty = m.objectProperty(m.identifier(exportName), getter);
    const properties = m.capture(m.arrayOf(objectProperty));
    // Example (webpack v5): __webpack_require__.d(__webpack_exports__, { a: () => b, c: () => d });
    const multiExport = m.expressionStatement(
      m.callExpression(constMemberExpression('__webpack_require__', 'd'), [
        m.identifier(namespaceObject),
        m.objectExpression(properties),
      ]),
    );

    /**
     * Used only for concatenated modules where we can't convert to ESM exports, so it still works at runtime.
     */
    function definePropertyExport(path: NodePath) {
      const [replacement] = path.insertAfter(
        statement`Object.defineProperty(${namespaceObject.current!}, '${
          exportName.current
        }', {
          enumerable: true,
          get: () => ${returnValue.current}
        });`(),
      );
      replacement.scope.crawl();
      replacement.addComment(
        'leading',
        'webcrack:concatenated-module-export',
        true,
      );
    }

    return {
      ExpressionStatement: (path) => {
        if (!path.parentPath.isProgram()) return path.skip();

        if (singleExport.match(path.node)) {
          if (namespaceObject.current === '__webpack_exports__') {
            manager.transformExport(
              path.scope,
              exportName.current!,
              returnValue.current!,
            );
          } else {
            definePropertyExport(path);
          }
          path.remove();
        } else if (defaultExportAssignment.match(path.node)) {
          manager.exports.add('default');
          path.replaceWith(statement`export default ${returnValue.current}`());
        } else if (multiExport.match(path.node)) {
          for (const property of properties.current!) {
            objectProperty.match(property); // To easily get the captures per property
            if (namespaceObject.current === '__webpack_exports__') {
              manager.transformExport(
                path.scope,
                exportName.current!,
                returnValue.current!,
              );
            } else {
              definePropertyExport(path);
            }
          }
          path.remove();
        }
      },
    };
  },
} satisfies Transform<ImportExportManager>;
