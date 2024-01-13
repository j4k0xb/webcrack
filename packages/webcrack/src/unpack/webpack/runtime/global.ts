import * as t from '@babel/types';
import { Transform, constMemberExpression } from '../../../ast-utils';

/**
 * `webpack/runtime/global`, `__webpack_require__.g`
 *
 * webpack injects this when a module accesses `global`
 */
export default {
  name: 'global',
  tags: ['safe'],
  visitor() {
    const matcher = constMemberExpression('__webpack_require__', 'g');
    return {
      Expression(path) {
        if (!matcher.match(path.node)) return;
        path.replaceWith(t.identifier('global'));
        this.changes++;
      },
    };
  },
} satisfies Transform;
