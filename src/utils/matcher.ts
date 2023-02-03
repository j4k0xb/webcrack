import * as t from '@babel/types';
import * as m from '@codemod/matchers';

export function infiniteLoop(body?: m.Matcher<t.Statement>) {
  return m.or(
    m.forStatement(undefined, null, undefined, body),
    m.whileStatement(m.booleanLiteral(true), body)
  );
}
