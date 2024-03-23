import { statement } from '@babel/template';
import * as m from '@codemod/matchers';
import type { Transform } from '../../../ast-utils';
import { constMemberExpression } from '../../../ast-utils';

/**
 * `__webpack_require__.r(__webpack_exports__);` defines `__esModule` on exports.
 *
 * When the [ModuleConcatenationPlugin](https://webpack.js.org/plugins/module-concatenation-plugin/)
 * is enabled, it can use a namespace object variable instead:
 * https://github.com/webpack/webpack/blob/dfffd6a241bf1d593b3fd31b4b279f96f4a4aab1/lib/optimize/ConcatenatedModule.js#L58
 *
 * It is very hard to separate concatenated modules again, so it will only transform the main module.
 */
export default {
  name: 'namespace-object',
  tags: ['safe'],
  scope: true,
  visitor(options = { isESM: false }) {
    const namespaceObject = m.capture(m.anyString());
    const matcher = m.expressionStatement(
      m.callExpression(constMemberExpression('__webpack_require__', 'r'), [
        m.identifier(namespaceObject),
      ]),
    );

    return {
      ExpressionStatement(path) {
        if (!path.parentPath.isProgram()) return path.skip();
        if (!matcher.match(path.node)) return;

        if (namespaceObject.current === '__webpack_exports__') {
          path.remove();
        } else {
          const [replacement] = path.replaceWith(
            statement`Object.defineProperty(${namespaceObject.current!}, "__esModule", { value: true });`(),
          );
          replacement.scope.crawl();

          const binding = path.scope.getBinding(namespaceObject.current!);
          binding?.path
            .getStatementParent()
            ?.addComment(
              'leading',
              'webcrack:concatenated-module-namespace-object',
              true,
            );
        }

        options.isESM = true;
        this.changes++;
      },
    };
  },
} satisfies Transform<{ isESM: boolean }>;
