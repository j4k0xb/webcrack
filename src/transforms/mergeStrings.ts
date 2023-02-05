import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'mergeStrings',
  tags: ['safe', 'readability'],
  visitor: () => ({
    exit(path) {
      if (matcher.match(path.node)) {
        // "a" + "b" -> "ab"
        path.replaceWith(
          t.stringLiteral(left.current!.value + right.current!.value)
        );
        this.changes++;
      } else if (nestedMatcher.match(path.parent) && path.isStringLiteral()) {
        // a + "b" + "c" -> a + "bc"
        left.current!.value += right.current!.value;
        path.remove();
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;

const left = m.capture(m.stringLiteral(m.anyString()));
const right = m.capture(m.stringLiteral(m.anyString()));

const matcher = m.binaryExpression('+', left, right);
const nestedMatcher = m.binaryExpression(
  '+',
  m.binaryExpression('+', m.anything(), left),
  right
);
