import { statement } from '@babel/template';
import type { Statement } from '@babel/types';
import * as m from '@codemod/matchers';
import { constMemberExpression } from '../../ast-utils';
import type { WebpackModule } from './module';

const buildVar = statement`var NAME = INIT;`;

/**
 * ```js
 * (function(global) {
 *   // ...
 * }.call(exports, require(7)))
 * ```
 * ->
 * ```js
 * var global = require(7);
 * // ...
 * ```
 */
export function inlineVarInjections(module: WebpackModule): void {
  const { program } = module.ast;
  const newBody: Statement[] = [];

  const body = m.capture(m.blockStatement());
  const params = m.capture(m.arrayOf(m.identifier()));
  const args = m.capture(
    m.anyList(m.or(m.thisExpression(), m.identifier('exports')), m.oneOrMore()),
  );
  const matcher = m.expressionStatement(
    m.callExpression(
      constMemberExpression(
        m.functionExpression(undefined, params, body),
        'call',
      ),
      args,
    ),
  );

  for (const node of program.body) {
    if (matcher.match(node)) {
      const vars = params.current!.map((param, i) =>
        buildVar({ NAME: param, INIT: args.current![i + 1] }),
      );
      newBody.push(...vars);
      newBody.push(...body.current!.body);
      // We can skip replacing uses of `this` because it always refers to the exports
    } else {
      newBody.push(node);
    }
  }
  program.body = newBody;
}
