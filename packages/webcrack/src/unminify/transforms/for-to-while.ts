import * as t from '@babel/types';
import type { Transform } from '../../ast-utils';

export default {
  name: 'for-to-while',
  tags: ['safe'],
  visitor() {
    return {
      ForStatement: {
        exit(path) {
          const { test, body, init, update } = path.node;
          if (init || update) return;
          path.replaceWith(
            t.whileStatement(test ?? t.booleanLiteral(true), body),
          );
          this.changes++;
        },
      },
    };
  },
} satisfies Transform;
