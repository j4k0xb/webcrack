import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'deterministicIf',
  tags: ['unsafe', 'readability'],
  visitor: () => ({
    enter(path) {
      // TODO: check binding conflicts
      if (equalsMatcher.match(path.node)) {
        if (
          leftLiteral.current === rightLiteral.current &&
          t.isBlockStatement(path.node.consequent)
        ) {
          path.replaceWithMultiple(path.node.consequent.body);
          this.changes++;
        } else if (t.isBlockStatement(path.node.alternate)) {
          path.replaceWithMultiple(path.node.alternate.body);
          this.changes++;
        }
      }
      if (notEqualsMatcher.match(path.node)) {
        if (
          leftLiteral.current !== rightLiteral.current &&
          t.isBlockStatement(path.node.consequent)
        ) {
          path.replaceWithMultiple(path.node.consequent.body);
          this.changes++;
        } else if (t.isBlockStatement(path.node.alternate)) {
          path.replaceWithMultiple(path.node.alternate.body);
          this.changes++;
        }
      }
    },
    noScope: true,
  }),
} satisfies Transform;

const leftLiteral = m.capture(m.anyString());
const rightLiteral = m.capture(m.anyString());
const equalsMatcher = m.ifStatement(
  m.or(
    m.binaryExpression(
      '===',
      m.stringLiteral(leftLiteral),
      m.stringLiteral(rightLiteral)
    ),
    m.binaryExpression(
      '==',
      m.stringLiteral(leftLiteral),
      m.stringLiteral(rightLiteral)
    )
  )
);
const notEqualsMatcher = m.ifStatement(
  m.or(
    m.binaryExpression(
      '!==',
      m.stringLiteral(leftLiteral),
      m.stringLiteral(rightLiteral)
    ),
    m.binaryExpression(
      '!=',
      m.stringLiteral(leftLiteral),
      m.stringLiteral(rightLiteral)
    )
  )
);
