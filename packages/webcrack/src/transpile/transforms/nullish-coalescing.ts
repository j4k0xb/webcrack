import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';
import { isTemporaryVariable } from '../../ast-utils';

export default {
  name: 'nullish-coalescing',
  tags: ['safe'],
  scope: true,
  visitor() {
    const tmpVar = m.capture(m.identifier());
    const left = m.capture(m.anyExpression());
    const right = m.capture(m.anyExpression());
    // Example (Babel): var _tmp; (_tmp = left) !== null && _tmp !== undefined ? _tmp : right;
    const idMatcher = m.conditionalExpression(
      m.logicalExpression(
        '&&',
        m.binaryExpression(
          '!==',
          m.assignmentExpression('=', tmpVar, left),
          m.nullLiteral(),
        ),
        m.binaryExpression(
          '!==',
          m.fromCapture(tmpVar),
          m.identifier('undefined'),
        ),
      ),
      m.fromCapture(tmpVar),
      right,
    );

    const idLooseMatcher = m.conditionalExpression(
      m.binaryExpression(
        '!=',
        m.assignmentExpression('=', tmpVar, left),
        m.nullLiteral(),
      ),
      m.fromCapture(tmpVar),
      right,
    );

    // Example (SWC/esbuild): left != null ? left : (left = right);
    // Example (TS): left !== null && left !== undefined ? left : (left = right);
    const simpleIdMatcher = m.conditionalExpression(
      m.or(
        m.logicalExpression(
          '&&',
          m.binaryExpression('!==', left, m.nullLiteral()),
          m.binaryExpression(
            '!==',
            m.fromCapture(left),
            m.identifier('undefined'),
          ),
        ),
        m.binaryExpression('!=', left, m.nullLiteral()),
      ),
      m.fromCapture(left),
      right,
    );

    const iifeMatcher = m.callExpression(
      m.arrowFunctionExpression(
        [m.fromCapture(tmpVar)],
        m.anyExpression(),
        false,
      ),
      [],
    );

    return {
      ConditionalExpression: {
        exit(path) {
          if (idMatcher.match(path.node)) {
            const binding = path.scope.getBinding(tmpVar.current!.name);

            if (
              iifeMatcher.match(path.parentPath.parent) &&
              isTemporaryVariable(binding, 2, 'param')
            ) {
              path.parentPath.parentPath!.replaceWith(
                t.logicalExpression('??', left.current!, right.current!),
              );
              this.changes++;
            } else if (isTemporaryVariable(binding, 2, 'var')) {
              binding.path.remove();
              path.replaceWith(
                t.logicalExpression('??', left.current!, right.current!),
              );
              this.changes++;
            }
          } else if (idLooseMatcher.match(path.node)) {
            const binding = path.scope.getBinding(tmpVar.current!.name);
            if (!isTemporaryVariable(binding, 1)) return;

            binding.path.remove();
            path.replaceWith(
              t.logicalExpression('??', left.current!, right.current!),
            );
            this.changes++;
          } else if (simpleIdMatcher.match(path.node)) {
            path.replaceWith(
              t.logicalExpression('??', left.current!, right.current!),
            );
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
