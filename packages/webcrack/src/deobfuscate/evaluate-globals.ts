import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../ast-utils';

const FUNCTIONS = {
  atob,
  unescape,
  decodeURI,
  decodeURIComponent,
};

export default {
  name: 'evaluate-globals',
  tags: ['safe'],
  scope: true,
  visitor() {
    const name = m.capture(
      m.or(...(Object.keys(FUNCTIONS) as (keyof typeof FUNCTIONS)[])),
    );
    const arg = m.capture(m.anyString());
    const matcher = m.callExpression(m.identifier(name), [
      m.stringLiteral(arg),
    ]);

    return {
      CallExpression: {
        exit(path) {
          if (!matcher.match(path.node)) return;
          if (path.scope.hasBinding(name.current!, { noGlobals: true })) return;

          try {
            // Causes a "TypeError: Illegal invocation" without the globalThis receiver
            const value = FUNCTIONS[name.current!].call(
              globalThis,
              arg.current!,
            );
            if (isStringSafe(value)) {
              path.replaceWith(t.stringLiteral(value));
              this.changes++;
            }
          } catch {
            // ignore
          }
        },
      },
    };
  },
} satisfies Transform;

// Don't unpack strings which contain weird unicode characters which can cause issues when the file
// is parsed by other tools after the transformation.
function isStringSafe(s: string) {
  return /^[\x00-\x7F]*$/.test(s);
}
