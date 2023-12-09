import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '@webcrack/ast-utils';

export default {
  name: 'var-functions',
  tags: ['safe'],
  visitor() {
    const name = m.capture(m.identifier());
    const fn = m.capture(m.functionExpression(null));
    const matcher = m.variableDeclaration('var', [
      m.variableDeclarator(name, fn),
    ]);

    return {
      VariableDeclaration: {
        exit(path) {
          if (matcher.match(path.node)) {
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
