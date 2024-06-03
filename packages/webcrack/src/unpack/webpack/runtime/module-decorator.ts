import * as m from '@codemod/matchers';
import type { Transform } from '../../../ast-utils';
import { constMemberExpression } from '../../../ast-utils';

// TODO(webpack 4): `module = __webpack_require__('webpack/buildin/harmony-module.js');`
// or `module = __webpack_require__('webpack/buildin/module.js');`

/**
 * `__webpack_require__.hmd` and `__webpack_require__.nmd`
 *
 * The CommonJsPlugin injects this when a module accesses the global 'module' variable.
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
