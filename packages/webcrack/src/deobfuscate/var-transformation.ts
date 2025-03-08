import * as t from '@babel/types';
import { type Transform } from '../ast-utils';
import { generateUid } from '../ast-utils/scope';

// https://github.com/j4k0xb/webcrack/issues/159
export default {
  name: 'var-transformation',
  tags: ['safe'],
  scope: true,
  visitor() {
    return {
      Function: {
        exit(path) {
          const { params } = path.node;
          for (let i = params.length - 1; i >= 0; i--) {
            const p = params[i];
            if (!t.isIdentifier(p)) return;

            const binding = path.scope.getBinding(p.name);
            if (!binding || binding.constantViolations.length === 0) return;

            const cv = binding.constantViolations[0];
            if (!t.isAssignmentExpression(cv.node, { operator: '=' })) return;

            // check if the variable is used before the assignment
            const isUsedBefore = binding.referencePaths.some((rp) => {
              if (rp.node.start! <= cv.node.start!) return true;
              for (let p = rp.parentPath; p; p = p.parentPath) {
                if (p === cv) return true;
              }
              return false;
            });
            if (isUsedBefore) return;

            cv.parentPath!.replaceWith(
              t.variableDeclaration('var', [
                t.variableDeclarator(t.cloneNode(p), cv.node.right),
              ]),
            );
            p.name = generateUid(path.scope, p.name);
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
