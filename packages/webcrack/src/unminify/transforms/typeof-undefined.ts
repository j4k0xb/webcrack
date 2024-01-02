import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

const OPERATOR_MAP = {
  '>': '===',
  '<': '!==',
} as const;

export default {
  name: 'typeof-undefined',
  tags: ['safe'],
  visitor() {
    const operator = m.capture(m.or('>' as const, '<' as const));
    const argument = m.capture(m.anyExpression());
    const matcher = m.binaryExpression(
      operator,
      m.unaryExpression('typeof', argument),
      m.stringLiteral('u'),
    );
    return {
      BinaryExpression: {
        exit(path) {
          if (!matcher.match(path.node)) return;
          path.replaceWith(
            t.binaryExpression(
              OPERATOR_MAP[operator.current!],
              t.unaryExpression('typeof', argument.current!),
              t.stringLiteral('undefined'),
            ),
          );
          this.changes++;
        },
      },
    };
  },
} satisfies Transform;
