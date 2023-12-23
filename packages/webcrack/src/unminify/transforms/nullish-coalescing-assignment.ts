import { Binding } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../../ast-utils';

export default {
  name: 'nullish-coalescing-assignment',
  tags: ['safe'],
  scope: true,
  visitor() {
    const tmpVar = m.capture(m.identifier());
    const leftId = m.capture(m.identifier());
    const property = m.capture(m.identifier());
    const right = m.capture(m.anyExpression());
    // Example (Babel):  var tmp; (tmp = left).b ?? (tmp.b = c);
    const memberMatcher = m.logicalExpression(
      '??',
      m.memberExpression(m.assignmentExpression('=', tmpVar, leftId), property),
      m.assignmentExpression(
        '=',
        m.memberExpression(m.fromCapture(tmpVar), m.fromCapture(property)),
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

    function validateTmpVar(binding: Binding | undefined): binding is Binding {
      return (
        binding !== undefined &&
        binding.references === 1 &&
        binding.constantViolations.length === 1 &&
        binding.path.isVariableDeclarator() &&
        binding.path.node.init === null
      );
    }

    return {
      LogicalExpression: {
        exit(path) {
          if (memberMatcher.match(path.node)) {
            const binding = path.scope.getBinding(tmpVar.current!.name);
            if (!validateTmpVar(binding)) return;

            binding.path.remove();
            path.replaceWith(
              t.assignmentExpression(
                '??=',
                t.memberExpression(leftId.current!, property.current!),
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
