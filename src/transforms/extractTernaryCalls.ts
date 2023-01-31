import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'extractTernaryCalls',
  tags: ['safe'],
  visitor: options => ({
    CallExpression(path) {
      const conditionalMatch = m.capture(m.conditionalExpression());
      const identifierMatch = m.capture(m.anyString());
      const matcher = m.callExpression(m.identifier(identifierMatch), [
        conditionalMatch,
      ]);

      if (
        matcher.match(path.node) &&
        (!options || options.callee === identifierMatch.current)
      ) {
        const conditional = conditionalMatch.current!;

        path.replaceWith(
          t.conditionalExpression(
            conditional.test,
            t.callExpression(t.identifier(identifierMatch.current!), [
              conditional.consequent,
            ]),
            t.callExpression(t.identifier(identifierMatch.current!), [
              conditional.alternate,
            ])
          )
        );
      }
    },
    noScope: true,
  }),
} satisfies Transform<{ callee: string }>;
