import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';
import { isTemporaryVariable } from '../../ast-utils';

export default {
  name: 'logical-assignments',
  tags: ['safe'],
  scope: true,
  visitor() {
    const operator = m.capture(m.or('||' as const, '&&' as const));

    const left = m.capture(m.or(m.identifier(), m.memberExpression()));
    const right = m.capture(m.anyExpression());
    // Example: left || (left = right)
    const idMatcher = m.logicalExpression(
      operator,
      left,
      m.assignmentExpression('=', m.fromCapture(left), right),
    );

    const object = m.capture(m.anyExpression());
    const property = m.capture(m.anyExpression());
    const tmpVar = m.capture(m.identifier());
    const member = m.capture(
      m.memberExpression(m.fromCapture(tmpVar), m.fromCapture(property)),
    );
    // Example: var _tmp; (_tmp = x.y()).property || (_tmp.property = right);
    const memberMatcher = m.logicalExpression(
      operator,
      m.memberExpression(m.assignmentExpression('=', tmpVar, object), property),
      m.assignmentExpression('=', member, right),
    );

    // Example: var _tmp; x[_tmp = y()] || (x[_tmp] = z);
    const computedMemberMatcher = m.logicalExpression(
      operator,
      m.memberExpression(
        object,
        m.assignmentExpression('=', tmpVar, property),
        true,
      ),
      m.assignmentExpression(
        '=',
        m.memberExpression(m.fromCapture(object), m.fromCapture(tmpVar), true),
        right,
      ),
    );

    const tmpVar2 = m.capture(m.identifier());
    // Example:  var _tmp, _tmp2; (_tmp = x)[_tmp2 = y] || (_tmp[_tmp2] = z);
    const multiComputedMemberMatcher = m.logicalExpression(
      operator,
      m.memberExpression(
        m.assignmentExpression('=', tmpVar, object),
        m.assignmentExpression('=', tmpVar2, property),
        true,
      ),
      m.assignmentExpression(
        '=',
        m.memberExpression(m.fromCapture(tmpVar), m.fromCapture(tmpVar2), true),
        right,
      ),
    );

    return {
      LogicalExpression: {
        exit(path) {
          if (idMatcher.match(path.node)) {
            path.replaceWith(
              t.assignmentExpression(
                operator.current! + '=',
                left.current!,
                right.current!,
              ),
            );
            this.changes++;
          } else if (memberMatcher.match(path.node)) {
            const binding = path.scope.getBinding(tmpVar.current!.name);
            if (!isTemporaryVariable(binding, 1)) return;

            binding.path.remove();
            member.current!.object = object.current!;
            path.replaceWith(
              t.assignmentExpression(
                operator.current! + '=',
                member.current!,
                right.current!,
              ),
            );
            this.changes++;
          } else if (computedMemberMatcher.match(path.node)) {
            const binding = path.scope.getBinding(tmpVar.current!.name);
            if (!isTemporaryVariable(binding, 1)) return;

            binding.path.remove();
            path.replaceWith(
              t.assignmentExpression(
                operator.current! + '=',
                t.memberExpression(object.current!, property.current!, true),
                right.current!,
              ),
            );
            this.changes++;
          } else if (multiComputedMemberMatcher.match(path.node)) {
            const binding = path.scope.getBinding(tmpVar.current!.name);
            const binding2 = path.scope.getBinding(tmpVar2.current!.name);
            if (
              !isTemporaryVariable(binding, 1) ||
              !isTemporaryVariable(binding2, 1)
            )
              return;

            binding.path.remove();
            binding2.path.remove();
            path.replaceWith(
              t.assignmentExpression(
                operator.current! + '=',
                t.memberExpression(object.current!, property.current!, true),
                right.current!,
              ),
            );
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
