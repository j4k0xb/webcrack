import { expression } from '@babel/template';
import { Binding } from '@babel/traverse';
import * as m from '@codemod/matchers';
import { Transform, constMemberExpression } from '../../../ast-utils';

/**
 * `webpack/runtime/hasOwnProperty shorthand`
 *
 * Used mostly in other runtime helpers but sometimes it also appears in user code.
 */
export default {
  name: 'has-own-property',
  tags: ['safe'],
  run(ast, binding) {
    const object = m.capture(m.anyExpression());
    const property = m.capture(m.anyExpression());
    const matcher = m.callExpression(
      constMemberExpression('__webpack_require__', 'o'),
      [object, property],
    );

    binding?.referencePaths.forEach((path) => {
      if (!matcher.match(path.parentPath?.parent)) return;
      path.parentPath.parentPath!.replaceWith(
        expression`Object.hasOwn(${object.current}, ${property.current})`(),
      );
      this.changes++;
    });
  },
} satisfies Transform<Binding>;
