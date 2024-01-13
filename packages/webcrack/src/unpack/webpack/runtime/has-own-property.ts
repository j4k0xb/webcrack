import { expression } from '@babel/template';
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
  visitor() {
    const object = m.capture(m.anyExpression());
    const property = m.capture(m.anyExpression());
    const matcher = m.callExpression(
      constMemberExpression('__webpack_require__', 'o'),
      [object, property],
    );

    return {
      CallExpression(path) {
        if (!matcher.match(path.node)) return;
        path.replaceWith(
          expression`Object.hasOwn(${object.current}, ${property.current})`(),
        );
        this.changes++;
      },
    };
  },
} satisfies Transform;
