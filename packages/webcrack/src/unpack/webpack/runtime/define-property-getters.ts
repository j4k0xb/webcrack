import * as m from '@codemod/matchers';
import assert from 'assert';
import { Transform, constMemberExpression } from '../../../ast-utils';
import { ImportExportManager } from '../import-export-manager';
import { statement } from '@babel/template';

// TODO: hoist re-exports to the top of the file (but retain order relative to imports)

/**
 * `webpack/runtime/define property getters`
 *
 * Used to declare ESM exports.
 */
export default {
  name: 'define-property-getters',
  tags: ['unsafe'],
  scope: true,
  visitor(manager) {
    assert(manager);

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

    // Example (webpack v4): exports.default = 1;
    const defaultExportAssignment = m.expressionStatement(
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
      ExpressionStatement: (path) => {
        if (!path.parentPath.isProgram()) return path.skip();

        if (singleExport.match(path.node)) {
          manager.transformExport(
            path.scope,
            exportName.current!,
            returnValue.current!,
          );
          path.remove();
        } else if (defaultExportAssignment.match(path.node)) {
          manager.exports.add('default');
          path.replaceWith(statement`export default ${returnValue.current}`());
        } else if (multiExport.match(path.node)) {
          for (const property of properties.current!) {
            objectProperty.match(property); // To easily get the captures per property
            manager.transformExport(
              path.scope,
              exportName.current!,
              returnValue.current!,
            );
          }
          path.remove();
        }
      },
    };
  },
} satisfies Transform<ImportExportManager>;
