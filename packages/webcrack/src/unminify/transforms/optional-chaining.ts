import { Binding } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../../ast-utils';

export default {
  name: 'optional-chaining',
  tags: ['safe'],
  scope: true,
  visitor() {
    const object = m.capture(m.anyExpression());
    const member = m.capture(m.memberExpression(m.fromCapture(object)));
    // Example (TS): object === null || object === undefined ? undefined : object.property;
    const simpleMatcher = m.conditionalExpression(
      m.logicalExpression(
        '||',
        m.binaryExpression('===', object, m.nullLiteral()),
        m.binaryExpression(
          '===',
          m.fromCapture(object),
          m.identifier('undefined'),
        ),
      ),
      m.identifier('undefined'),
      member,
    );

    const tmpVar = m.capture(m.identifier());
    const tmpMember = m.capture(m.memberExpression(m.fromCapture(tmpVar)));
    // Example (Babel): var _tmp; (_tmp = object) === null || _tmp === void 0 ? void 0 : _tmp.property;
    const tmpMatcher = m.conditionalExpression(
      m.logicalExpression(
        '||',
        m.binaryExpression(
          '===',
          m.assignmentExpression('=', tmpVar, object),
          m.nullLiteral(),
        ),
        m.binaryExpression(
          '===',
          m.fromCapture(tmpVar),
          m.identifier('undefined'),
        ),
      ),
      m.identifier('undefined'),
      tmpMember,
    );

    function validateTmpVar(binding: Binding | undefined): binding is Binding {
      return (
        binding !== undefined &&
        binding.references === 2 &&
        binding.constantViolations.length === 1 &&
        binding.path.isVariableDeclarator() &&
        binding.path.node.init === null
      );
    }

    return {
      ConditionalExpression: {
        exit(path) {
          if (simpleMatcher.match(path.node)) {
            member.current!.optional = true;
            path.replaceWith(
              t.optionalMemberExpression(
                object.current!,
                member.current!.property as t.Expression,
                member.current!.computed,
                true,
              ),
            );
            this.changes++;
          } else if (tmpMatcher.match(path.node)) {
            const binding = path.scope.getBinding(tmpVar.current!.name);
            if (!validateTmpVar(binding)) return;

            binding.path.remove();
            tmpMember.current!.optional = true;
            path.replaceWith(
              t.optionalMemberExpression(
                object.current!,
                tmpMember.current!.property as t.Expression,
                tmpMember.current!.computed,
                true,
              ),
            );
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
