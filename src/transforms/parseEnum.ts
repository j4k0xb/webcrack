import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '.';
import { constMemberExpression } from '../utils/matcher';

export default {
  name: 'enum',
  tags: ['safe'],
  visitor() {
    const varId = m.capture(m.identifier());
    const paramId = m.capture(m.identifier());
    const returnStatement = m.returnStatement(m.fromCapture(paramId));
    const propertyName = m.capture(m.anyString());
    const assignment = m.expressionStatement(
      m.assignmentExpression(
        '=',
        m.memberExpression(
          m.fromCapture(paramId),
          m.assignmentExpression(
            '=',
            constMemberExpression(m.fromCapture(paramId), propertyName),
            m.numericLiteral()
          )
        ),
        m.stringLiteral(m.fromCapture(propertyName))
      )
    );
    const statements = m.capture(
      m.matcher<t.Statement[]>(predicate => {
        const statements = predicate as t.Statement[];
        if (statements.length < 2) return false;
        if (!returnStatement.match(statements.at(-1))) return false;
        for (let i = 0; i < statements.length - 1; i++) {
          if (!assignment.match(statements[i])) return false;
        }
        return true;
      })
    );

    const matcher = m.variableDeclaration(undefined, [
      m.variableDeclarator(
        varId,
        m.callExpression(
          m.arrowFunctionExpression([paramId], m.blockStatement(statements)),
          [m.logicalExpression('||', varId, m.objectExpression([]))]
        )
      ),
    ]);

    return {
      exit(path) {
        if (matcher.match(path.node)) {
          path.addComment('leading', 'enum');
          const members: t.TSEnumMember[] = [];
          for (let i = 0; i < statements.current!.length - 1; i++) {
            const statement = statements.current![i];
            const name = (statement as any).expression.right.value;
            // const value = (statement as any).expression.left.property.right;
            // members.push(t.tsEnumMember(name, value));
            members.push(t.tsEnumMember(t.identifier(name)));
          }
          const enumDeclaration = t.tsEnumDeclaration(varId.current!, members);
          path.insertAfter(enumDeclaration);
        }
      },
      noScope: true,
    };
  },
} satisfies Transform;
