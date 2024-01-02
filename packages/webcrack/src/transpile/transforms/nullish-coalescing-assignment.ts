import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';
import { isTemporaryVariable } from '../../ast-utils';

export default {
  name: 'nullish-coalescing-assignment',
  tags: ['safe'],
  scope: true,
  visitor() {
    const tmpVar = m.capture(m.identifier());
    const leftId = m.capture(m.identifier());
    const property = m.capture(m.identifier());
    const right = m.capture(m.anyExpression());
    const computed = m.capture<boolean>(m.anything());
    // Example (Babel):  var tmp; (tmp = left).b ?? (tmp.b = c);
    const memberMatcher = m.logicalExpression(
      '??',
      m.memberExpression(
        m.assignmentExpression('=', tmpVar, leftId),
        property,
        computed,
      ),
      m.assignmentExpression(
        '=',
        m.memberExpression(
          m.fromCapture(tmpVar),
          m.fromCapture(property),
          computed,
        ),
        right,
      ),
    );

    // Example (Babel): left ?? (left = right);
    const left = m.capture(m.or(m.identifier(), m.memberExpression()));
    const simpleMatcher = m.logicalExpression(
      '??',
      left,
      m.assignmentExpression('=', m.fromCapture(left), right),
    );

    return {
      LogicalExpression: {
        exit(path) {
          if (memberMatcher.match(path.node)) {
            const binding = path.scope.getBinding(tmpVar.current!.name);
            if (!isTemporaryVariable(binding, 1)) return;

            binding.path.remove();
            path.replaceWith(
              t.assignmentExpression(
                '??=',
                t.memberExpression(
                  leftId.current!,
                  property.current!,
                  computed.current,
                ),
                right.current!,
              ),
            );
            this.changes++;
          } else if (simpleMatcher.match(path.node)) {
            path.replaceWith(
              t.assignmentExpression('??=', left.current!, right.current!),
            );
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
