import * as m from '@codemod/matchers';
import { Transform, constMemberExpression } from '../../../ast-utils';

/**
 * `webpack/runtime/make namespace object`
 *
 * `__webpack_require__.r(__webpack_exports__);` defines `__esModule` on exports.
 */
export default {
  name: 'namespace-object',
  tags: ['safe'],
  visitor(options = { isESM: false }) {
    const matcher = m.expressionStatement(
      m.callExpression(constMemberExpression('__webpack_require__', 'r'), [
        m.identifier(),
      ]),
    );

    return {
      ExpressionStatement(path) {
        if (!path.parentPath.isProgram()) return path.skip();
        if (!matcher.match(path.node)) return;
        options.isESM = true;
        path.remove();
        this.changes++;
      },
    };
  },
} satisfies Transform<{ isESM: boolean }>;
