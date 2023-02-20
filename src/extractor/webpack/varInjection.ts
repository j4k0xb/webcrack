import { statement } from '@babel/template';
import { Statement } from '@babel/types';
import * as m from '@codemod/matchers';
import { Module } from '../module';

// var because the same name could already be declared
const buildVar = statement`var NAME = VALUE;`;

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
export function inlineVarInjections(module: Module) {
  const { program } = module.ast;
  const newBody: Statement[] = [];

  for (const statement of program.body) {
    if (matcher.match(statement)) {
      const vars = params.current!.map((param, i) =>
        buildVar({ NAME: param, VALUE: args.current![i + 1] })
      );
      newBody.push(...vars);
      newBody.push(...body.current!.body);
      // We can skip replacing uses of `this` because it always refers to the exports
    } else {
      newBody.push(statement);
    }
  }
  program.body = newBody;
}

const body = m.capture(m.blockStatement());
const params = m.capture(m.arrayOf(m.identifier()));
const args = m.capture(
  m.anyList(m.or(m.thisExpression(), m.identifier('exports')), m.oneOrMore())
);
const matcher = m.expressionStatement(
  m.callExpression(
    m.memberExpression(
      m.functionExpression(undefined, params, body),
      m.identifier('call')
    ),
    args
  )
);
