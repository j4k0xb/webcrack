import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

export default {
  name: 'merge-strings',
  tags: ['safe'],
  visitor() {
    const left = m.capture(m.stringLiteral(m.anyString()));
    const right = m.capture(m.stringLiteral(m.anyString()));

    const matcher = m.binaryExpression('+', left, right);
    const nestedMatcher = m.binaryExpression(
      '+',
      m.binaryExpression('+', m.anything(), left),
      right,
    );

    return {
      BinaryExpression: {
        exit(path) {
          if (matcher.match(path.node)) {
            // "a" + "b" -> "ab"
            path.replaceWith(
              t.stringLiteral(left.current!.value + right.current!.value),
            );
            this.changes++;
          }
        },
      },
      StringLiteral: {
        exit(path) {
          if (nestedMatcher.match(path.parent)) {
            // (a + "b") + "c" -> a + "bc"
            //  left ^      ^ right (path)
            left.current!.value += right.current!.value;
            path.remove();
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
