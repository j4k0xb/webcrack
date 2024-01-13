import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import assert from 'assert';
import { Transform, constMemberExpression } from '../../ast-utils';
import { ImportExportManager } from './import-export-manager';

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
          // manager.addExport(path, exportName.current!, returnValue.current!);
          path.remove();
          this.changes++;
        } else if (defaultExpressionExport.match(path.node)) {
          path.replaceWith(t.exportDefaultDeclaration(returnValue.current!));
          this.changes++;
        } else if (multiExport.match(path.node)) {
          for (const property of properties.current!) {
            objectProperty.match(property); // To easily get the captures per property
            // manager.addExport(path, exportName.current!, returnValue.current!);
          }
          path.remove();
          this.changes++;
        }
      },
    };
  },
} satisfies Transform<ImportExportManager>;
