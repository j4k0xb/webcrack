import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';

export default {
  name: 'deterministicIf',
  tags: ['unsafe', 'readability'],
  visitor: () => ({
    enter(path) {
      // TODO: check binding conflicts

      if (ifEqualsMatcher.match(path.node)) {
        if (leftLiteral.current === rightLiteral.current) {
          replace(path, path.node.consequent);
          this.changes++;
        } else if (path.node.alternate) {
          replace(path, path.node.alternate);
          this.changes++;
        }
      }
      if (ifNotEqualsMatcher.match(path.node)) {
        if (leftLiteral.current !== rightLiteral.current) {
          replace(path, path.node.consequent);
          this.changes++;
        } else if (path.node.alternate) {
          replace(path, path.node.alternate);
          this.changes++;
        }
      }
    },
    noScope: true,
  }),
} satisfies Transform;

function replace(path: NodePath, node: t.Node) {
  if (t.isBlockStatement(node)) {
    path.replaceWithMultiple(node.body);
  } else {
    path.replaceWith(node);
  }
}

const leftLiteral = m.capture(m.anyString());
const rightLiteral = m.capture(m.anyString());
const equalsMatcher = m.binaryExpression(
  m.or('===', '=='),
  m.stringLiteral(leftLiteral),
  m.stringLiteral(rightLiteral)
);
const notEqualsMatcher = m.binaryExpression(
  m.or('!==', '!='),
  m.stringLiteral(leftLiteral),
  m.stringLiteral(rightLiteral)
);
const ifEqualsMatcher = m.or(
  m.ifStatement(equalsMatcher),
  m.conditionalExpression(equalsMatcher)
);
const ifNotEqualsMatcher = m.or(
  m.ifStatement(notEqualsMatcher),
  m.conditionalExpression(notEqualsMatcher)
);
