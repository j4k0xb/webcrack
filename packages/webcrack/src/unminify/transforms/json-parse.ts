import { parseExpression } from '@babel/parser';
import * as t from '@babel/types';
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
              // JSON may repeat "__proto__", which is a syntax error in an object literal
              const parsed = parseExpression(string.current!, {
                errorRecovery: true,
              });
              if (
                parsed.errors?.some(
                  (error) => error.reasonCode !== 'DuplicateProto',
                )
              )
                return;

              // JSON.parse defines "__proto__" as an own property, a literal key sets the prototype
              t.traverseFast(parsed, (node) => {
                if (
                  t.isObjectProperty(node) &&
                  t.isStringLiteral(node.key, { value: '__proto__' })
                ) {
                  node.computed = true;
                }
              });
              path.replaceWith(parsed);
              this.changes++;
            } catch {
              // ignore
            }
          }
        },
      },
    };
  },
} satisfies Transform;
