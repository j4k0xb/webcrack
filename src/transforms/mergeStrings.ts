import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'mergeStrings',
  tags: ['safe', 'readability'],
  visitor: () => ({
    // On exit to correctly match nested string concatenations
    exit(path) {
      if (matcher.match(path.node)) {
        path.replaceWith(t.stringLiteral(left.current! + right.current!));
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;

const left = m.capture(m.anyString());
const right = m.capture(m.anyString());
const matcher = m.binaryExpression(
  '+',
  m.stringLiteral(left),
  m.stringLiteral(right)
);
