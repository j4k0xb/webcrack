import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Tag, Transform } from '.';

export default {
  name: 'sequence',
  tags: [Tag.SAFE, Tag.PREPROCESS],
  visitor: {
    ExpressionStatement(path) {
      if (t.isSequenceExpression(path.node.expression)) {
        const statements = path.node.expression.expressions.map(expr =>
          t.expressionStatement(expr)
        );
        path.replaceWithMultiple(statements);
        this.changes++;
      }
    },
    ReturnStatement(path) {
      const sequence = m.capture(m.sequenceExpression());
      const matcher = m.returnStatement(sequence);
      if (matcher.match(path.node)) {
        const expressions = sequence.current!.expressions;
        path.node.argument = expressions.pop();
        const statements = expressions.map(expr => t.expressionStatement(expr));
        path.insertBefore(statements);
        this.changes++;
      }
    },
    IfStatement(path) {
      const sequence = m.capture(m.sequenceExpression());
      const matcher = m.ifStatement(sequence);
      if (matcher.match(path.node)) {
        const expressions = sequence.current!.expressions;
        path.node.test = expressions.pop()!;
        const statements = expressions.map(expr => t.expressionStatement(expr));
        path.insertBefore(statements);
        this.changes++;
      }
    },
    ForInStatement(path) {
      const sequence = m.capture(m.sequenceExpression());
      const matcher = m.forInStatement(m.anything(), sequence);
      if (matcher.match(path.node)) {
        const expressions = sequence.current!.expressions;
        path.node.right = expressions.pop()!;
        const statements = expressions.map(expr => t.expressionStatement(expr));
        path.insertBefore(statements);
        this.changes++;
      }
    },
    noScope: true,
  },
} satisfies Transform;
