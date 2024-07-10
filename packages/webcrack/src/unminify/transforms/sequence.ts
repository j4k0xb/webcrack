import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { safeLiteral, type Transform } from '../../ast-utils';

export default {
  name: 'sequence',
  tags: ['safe'],
  visitor() {
    // To retain the evaluation order of `<anything> = (x(), y());`, only identifiers and member expressions are allowed.
    // `obj.foo.bar = (x(), y());` would trigger the getter for `obj.foo` before `x()` is evaluated.
    const assignmentVariable = m.or(
      m.identifier(),
      m.memberExpression(m.identifier(), m.or(m.identifier(), safeLiteral)),
    );
    const assignedSequence = m.capture(m.sequenceExpression());
    const assignmentMatcher = m.assignmentExpression(
      // "||=", "&&=", and "??=" have short-circuiting behavior
      m.or(
        '=',
        '+=',
        '-=',
        '*=',
        '/=',
        '%=',
        '**=',
        '<<=',
        '>>=',
        '>>>=',
        '|=',
        '^=',
        '&=',
      ),
      assignmentVariable,
      assignedSequence,
    );

    return {
      AssignmentExpression: {
        exit(path) {
          if (!assignmentMatcher.match(path.node)) return;

          const { expressions } = assignedSequence.current!;
          path.node.right = expressions.pop()!;
          const newNodes = path.parentPath.isExpressionStatement()
            ? expressions.map(t.expressionStatement)
            : expressions;
          path.insertBefore(newNodes);
          this.changes++;
        },
      },
      ExpressionStatement: {
        exit(path) {
          if (!t.isSequenceExpression(path.node.expression)) return;

          const statements = path.node.expression.expressions.map(
            t.expressionStatement,
          );
          path.replaceWithMultiple(statements);
          this.changes++;
        },
      },
      ReturnStatement: {
        exit(path) {
          if (!t.isSequenceExpression(path.node.argument)) return;

          const { expressions } = path.node.argument;
          path.node.argument = expressions.pop();
          const statements = expressions.map(t.expressionStatement);
          path.insertBefore(statements);
          this.changes++;
        },
      },
      IfStatement: {
        exit(path) {
          if (!t.isSequenceExpression(path.node.test)) return;

          const { expressions } = path.node.test;
          path.node.test = expressions.pop()!;
          const statements = expressions.map(t.expressionStatement);
          path.insertBefore(statements);
          this.changes++;
        },
      },
      SwitchStatement: {
        exit(path) {
          if (!t.isSequenceExpression(path.node.discriminant)) return;

          const { expressions } = path.node.discriminant;
          path.node.discriminant = expressions.pop()!;
          const statements = expressions.map(t.expressionStatement);
          path.insertBefore(statements);
          this.changes++;
        },
      },
      ThrowStatement: {
        exit(path) {
          if (!t.isSequenceExpression(path.node.argument)) return;

          const { expressions } = path.node.argument;
          path.node.argument = expressions.pop()!;
          const statements = expressions.map(t.expressionStatement);
          path.insertBefore(statements);
          this.changes++;
        },
      },
      ForInStatement: {
        exit(path) {
          if (!t.isSequenceExpression(path.node.right)) return;

          const { expressions } = path.node.right;
          path.node.right = expressions.pop()!;
          const statements = expressions.map(t.expressionStatement);
          path.insertBefore(statements);
          this.changes++;
        },
      },
      ForOfStatement: {
        exit(path) {
          if (!t.isSequenceExpression(path.node.right)) return;

          const { expressions } = path.node.right;
          path.node.right = expressions.pop()!;
          const statements = expressions.map(t.expressionStatement);
          path.insertBefore(statements);
          this.changes++;
        },
      },
      ForStatement: {
        exit(path) {
          if (t.isSequenceExpression(path.node.init)) {
            const statements = path.node.init.expressions.map(
              t.expressionStatement,
            );
            path.node.init = null;
            path.insertBefore(statements);
            this.changes++;
          }
          if (
            t.isSequenceExpression(path.node.update) &&
            path.node.body.type === 'EmptyStatement'
          ) {
            const { expressions } = path.node.update;
            path.node.update = expressions.pop()!;
            const statements = expressions.map(t.expressionStatement);
            path.node.body = t.blockStatement(statements);
            this.changes++;
          }
        },
      },
      VariableDeclaration: {
        exit(path) {
          const sequence = m.capture(m.sequenceExpression());
          const matcher = m.variableDeclaration(undefined, [
            m.variableDeclarator(undefined, sequence),
          ]);
          if (!matcher.match(path.node)) return;

          const { expressions } = sequence.current!;
          path.node.declarations[0].init = expressions.pop();
          const statements = expressions.map(t.expressionStatement);
          path.getStatementParent()?.insertBefore(statements);
          this.changes++;
        },
      },
      SequenceExpression: {
        exit(path) {
          const { expressions } = path.node;
          if (expressions.every((node) => safeLiteral.match(node))) {
            path.replaceWith(expressions.at(-1)!);
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
