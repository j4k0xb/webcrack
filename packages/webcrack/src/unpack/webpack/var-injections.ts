import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform, constMemberExpression } from '../../ast-utils';

/**
 * ```diff
 * - (function(global) { ... }).call(exports, require(7));
 * + var global = require(7);
 * ```
 */
export default {
  name: 'var-injections',
  tags: ['unsafe'], // doesn't handle possible variable conflicts when merging with the parent scope
  visitor() {
    const statements = m.capture(m.arrayOf(m.anyStatement()));
    const params = m.capture(m.arrayOf(m.identifier()));
    const args = m.capture(
      m.anyList(
        m.or(m.thisExpression(), m.identifier('exports')),
        m.oneOrMore(),
      ),
    );
    const matcher = m.expressionStatement(
      m.callExpression(
        constMemberExpression(
          m.functionExpression(null, params, m.blockStatement(statements)),
          'call',
        ),
        args,
      ),
    );

    return {
      ExpressionStatement(path) {
        if (!path.parentPath.isProgram()) path.skip();
        if (!matcher.match(path.node)) return;
        if (params.current!.length !== args.current!.length - 1) return;

        const variables = params.current!.map((param, i) =>
          t.variableDeclaration('var', [
            t.variableDeclarator(param, args.current![i + 1]),
          ]),
        );
        path.replaceWithMultiple([...variables, ...statements.current!]);
        this.changes++;
      },
    };
  },
} satisfies Transform;
