import { parseExpression } from '@babel/parser';
import * as m from '@codemod/matchers';
import { Transform } from '.';
import { constMemberExpression } from '../utils/matcher';

export default {
  name: 'jsonParse',
  tags: ['safe'],
  visitor: () => {
    const string = m.capture(m.anyString());
    const matcher = m.callExpression(constMemberExpression('JSON', 'parse'), [
      m.stringLiteral(string),
    ]);

    return {
      CallExpression: {
        exit(path) {
          if (matcher.match(path.node)) {
            try {
              JSON.parse(string.current!);
              const parsed = parseExpression(string.current!);
              path.replaceWith(parsed);
              this.changes++;
            } catch (error) {
              // ignore
            }
          }
        },
      },
      noScope: true,
    };
  },
} satisfies Transform;
