import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../ast-utils';

// Unsafe because variables may be used before they are declared, but functions are hoisted
// Example: `console.log(a); var a = function() {}` logs `undefined`
// `console.log(a); function a() {}` logs the function
export default {
  name: 'var-functions',
  tags: ['unsafe'],
  visitor() {
    const name = m.capture(m.identifier());
    const fn = m.capture(m.functionExpression(null));
    const matcher = m.variableDeclaration('var', [
      m.variableDeclarator(name, fn),
    ]);

    return {
      VariableDeclaration: {
        exit(path) {
          if (matcher.match(path.node) && path.key !== 'init') {
            path.replaceWith(
              t.functionDeclaration(
                name.current,
                fn.current!.params,
                fn.current!.body,
                fn.current!.generator,
                fn.current!.async,
              ),
            );
          }
        },
      },
    };
  },
} satisfies Transform;
