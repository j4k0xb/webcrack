import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../ast-utils';
import { constMemberExpression, infiniteLoop } from '../ast-utils';

export default {
  name: 'control-flow-switch',
  tags: ['safe'],
  visitor() {
    const sequenceName = m.capture(m.identifier());
    const sequenceString = m.capture(
      m.matcher<string>((s) => /^\d+(\|\d+)*$/.test(s)),
    );
    const iterator = m.capture(m.identifier());

    const cases = m.capture(
      m.arrayOf(
        m.switchCase(
          m.stringLiteral(m.matcher((s) => /^\d+$/.test(s))),
          m.anyList(
            m.zeroOrMore(),
            m.or(m.continueStatement(), m.returnStatement()),
          ),
        ),
      ),
    );

    const matcher = m.blockStatement(
      m.anyList<t.Statement>(
        // E.g. const sequence = "2|4|3|0|1".split("|")
        m.variableDeclaration(undefined, [
          m.variableDeclarator(
            sequenceName,
            m.callExpression(
              constMemberExpression(m.stringLiteral(sequenceString), 'split'),
              [m.stringLiteral('|')],
            ),
          ),
        ]),
        // E.g. let iterator = 0 or -0x1a70 + 0x93d + 0x275 * 0x7
        m.variableDeclaration(undefined, [m.variableDeclarator(iterator)]),
        infiniteLoop(
          m.blockStatement([
            m.switchStatement(
              // E.g. switch (sequence[iterator++]) {
              m.memberExpression(
                m.fromCapture(sequenceName),
                m.updateExpression('++', m.fromCapture(iterator)),
                true,
              ),
              cases,
            ),
            m.breakStatement(),
          ]),
        ),
        m.zeroOrMore(),
      ),
    );

    return {
      BlockStatement: {
        exit(path) {
          if (!matcher.match(path.node)) return;

          const caseStatements = new Map(
            cases.current!.map((c) => [
              (c.test as t.StringLiteral).value,
              t.isContinueStatement(c.consequent.at(-1))
                ? c.consequent.slice(0, -1)
                : c.consequent,
            ]),
          );

          const sequence = sequenceString.current!.split('|');
          const newStatements = sequence.flatMap((s) => caseStatements.get(s)!);

          path.node.body.splice(0, 3, ...newStatements);
          this.changes += newStatements.length + 3;
        },
      },
    };
  },
} satisfies Transform;
