import { parseExpression } from '@babel/parser';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';
import { constMemberExpression } from '../../ast-utils';

export default {
  name: 'json-parse',
  tags: ['safe'],
  scope: true,
  visitor: () => {
    const string = m.capture(m.anyString());
    const matcher = m.callExpression(constMemberExpression('JSON', 'parse'), [
      m.stringLiteral(string),
    ]);

    return {
      CallExpression: {
        exit(path) {
          if (
            matcher.match(path.node) &&
            !path.scope.hasBinding('JSON', { noGlobals: true })
          ) {
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
    };
  },
} satisfies Transform;
