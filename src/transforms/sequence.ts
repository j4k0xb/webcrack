import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';

export default function (ast: t.Node) {
  traverse(ast, {
    ExpressionStatement(path) {
      if (t.isSequenceExpression(path.node.expression)) {
        const statements = path.node.expression.expressions.map(expr =>
          t.expressionStatement(expr)
        );
        path.replaceWithMultiple(statements);
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
      }
    },
  });
}
