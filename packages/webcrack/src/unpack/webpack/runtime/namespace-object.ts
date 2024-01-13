import * as m from '@codemod/matchers';
import { Transform, constMemberExpression } from '../../../ast-utils';

/**
 * `__webpack_require__.r(__webpack_exports__);` defines `__esModule` on exports.
 *
 * When the [ModuleConcatenationPlugin](https://webpack.js.org/plugins/module-concatenation-plugin/)
 * is enabled, it can also use a namespace object variable:
 * https://github.com/webpack/webpack/blob/dfffd6a241bf1d593b3fd31b4b279f96f4a4aab1/lib/optimize/ConcatenatedModule.js#L58
 */
export default {
  name: 'namespace-object',
  tags: ['safe'],
  scope: true,
  visitor(options = { isESM: false }) {
    const exportsName = m.capture(m.anyString());
    const matcher = m.expressionStatement(
      m.callExpression(constMemberExpression('__webpack_require__', 'r'), [
        m.identifier(exportsName),
      ]),
    );

    return {
      ExpressionStatement(path) {
        if (!path.parentPath.isProgram()) return path.skip();
        if (!matcher.match(path.node)) return;
        options.isESM = true;
        path.remove();
        if (exportsName.current !== '__webpack_exports__') {
          path.scope.getBinding(exportsName.current!)?.path.remove();
        }
        this.changes++;
      },
    };
  },
} satisfies Transform<{ isESM: boolean }>;
