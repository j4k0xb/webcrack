import * as m from '@codemod/matchers';
import { Transform, constMemberExpression } from '../../../ast-utils';

/**
 * `webpack/runtime/harmony module decorator` and `webpack/runtime/node module decorator`
 *
 * The CommonJsPlugin injects this when a module accesses the global 'module' variable.
 *
 * - // TODO(webpack 4): `module = __webpack_require__('webpack/buildin/harmony-module.js');`
 * or `module = __webpack_require__('webpack/buildin/module.js');`
 * - webpack 5: `module = __webpack_require__.hmd(module);` or `module = __webpack_require__.nmd(module);`
 */
export default {
  name: 'module-decorator',
  tags: ['safe'],
  visitor() {
    const moduleVar = m.capture(m.identifier());
    const matcher = m.expressionStatement(
      m.assignmentExpression(
        '=',
        moduleVar,
        m.callExpression(
          constMemberExpression('__webpack_require__', m.or('hmd', 'nmd')),
          [m.fromCapture(moduleVar)],
        ),
      ),
    );

    return {
      ExpressionStatement(path) {
        if (!path.parentPath.isProgram()) return path.skip();
        if (!matcher.match(path.node)) return;
        path.remove();
        this.changes++;
      },
    };
  },
} satisfies Transform;
