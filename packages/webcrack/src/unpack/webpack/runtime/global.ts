import { Binding } from '@babel/traverse';
import * as t from '@babel/types';
import { Transform, constMemberExpression } from '../../../ast-utils';

/**
 * `__webpack_require__.g`
 *
 * webpack injects this when a module accesses `global`
 */
export default {
  name: 'global',
  tags: ['safe'],
  run(ast, binding) {
    const matcher = constMemberExpression('__webpack_require__', 'g');
    binding?.referencePaths.forEach((path) => {
      if (!matcher.match(path.parent)) return;
      path.parentPath!.replaceWith(t.identifier('global'));
      this.changes++;
    });
  },
} satisfies Transform<Binding>;
