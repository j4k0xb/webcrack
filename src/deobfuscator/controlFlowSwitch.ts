import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../transforms';
import { constMemberExpression, infiniteLoop } from '../utils/matcher';

export default {
  name: 'controlFlowSwitch',
  tags: ['safe'],
  visitor: () => ({
    enter(path) {
      if (!matcher.match(path.node)) return;

      const node = path.node as t.BlockStatement;
      const caseStatements = new Map(
        cases.current!.map(c => [
          (c.test as t.StringLiteral).value,
          c.consequent.slice(0, -1),
        ])
      );

      const sequence = sequenceString.current!.split('|');
      const newStatements = sequence.flatMap(s => caseStatements.get(s)!);

      node.body.splice(0, 3, ...newStatements);
      this.changes += newStatements.length + 3;
    },
  }),
} satisfies Transform;

const sequenceName = m.capture(m.identifier());
const sequenceString = m.capture(
  m.matcher<string>(s => /^\d+(\|\d+)*$/.test(s as string))
);
const iterator = m.capture(m.identifier());

const cases = m.capture(
  m.arrayOf(
    m.switchCase(
      m.stringLiteral(m.matcher<string>(s => /^\d+$/.test(s as string))),
      m.or(
        m.anyList(m.oneOrMore(), m.continueStatement()),
        m.oneOf(m.returnStatement())
      )
    )
  )
);

const matcher = m.blockStatement(
  m.anyList<t.Statement>(
    // E.g. const sequence = "2|4|3|0|1".split("|")
    m.variableDeclaration(undefined, [
      m.variableDeclarator(
        sequenceName,
        m.callExpression(
          constMemberExpression(m.stringLiteral(sequenceString), 'split'),
          [m.stringLiteral('|')]
        )
      ),
    ]),
    // E.g. let iterator = 0
    m.variableDeclaration(undefined, [
      m.variableDeclarator(iterator, m.numericLiteral(0)),
    ]),
    infiniteLoop(
      m.blockStatement([
        m.switchStatement(
          // E.g. switch (sequence[iterator++]) {
          m.memberExpression(
            m.fromCapture(sequenceName),
            m.updateExpression('++', m.fromCapture(iterator)),
            true
          ),
          cases
        ),
        m.breakStatement(),
      ])
    ),
    m.zeroOrMore()
  )
);
