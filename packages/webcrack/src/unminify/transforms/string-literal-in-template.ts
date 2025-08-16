import * as t from '@babel/types';
import type { Transform } from '../../ast-utils';

export default {
  name: 'string-literal-in-template-literal',
  tags: ['safe'],
  visitor: () => ({
    TemplateLiteral(path) {
      // inline string literals in template literals
      // e.g. `Hello ${'World'}!` -> `Hello World!`
      for (let i = 0; i < path.node.expressions.length; i++) {
        const expr = path.node.expressions[i];
        if (t.isStringLiteral(expr)) {
          path.node.expressions.splice(i, 1);
          const main = path.node.quasis[i];
          main.value.raw += expr.value;

          const next = path.node.quasis[i + 1];
          if (next) {
            main.value.raw += next.value.raw;
            path.node.quasis.splice(i + 1, 1);
          }

          this.changes++;
          i--;
        }
      }
    },
  }),
} satisfies Transform;
