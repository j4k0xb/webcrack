import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import type { Transform } from '../../ast-utils';

const matcher = m.forStatement(
  m.variableDeclaration('var', m.arrayOf(m.variableDeclarator(m.identifier()))),
);

// This contains some overlapping logic with the "split-variable-declarations" transform
// but is done separately because it also works with a single variable and we want to avoid
// accessing scope in the prepare stage for performance reasons.
export default {
  name: 'split-for-loop-vars',
  tags: ['safe'],
  scope: true,
  visitor: () => ({
    ForStatement: {
      exit(path) {
        if (!matcher.match(path.node)) return;
        const { init, test, update } = path.node;
        const { declarations } = init as t.VariableDeclaration;

        for (let i = 0; i < declarations.length; i++) {
          const declarator = declarations[i];
          const binding = path.scope.getBinding(
            (declarator.id as t.Identifier).name,
          );
          if (!binding) break;

          const isUsedInTestOrUpdate =
            binding.constantViolations.some((reference) =>
              reference.find((p) => p.node === test || p.node === update),
            ) ||
            binding.referencePaths.some((reference) =>
              reference.find((p) => p.node === test || p.node === update),
            );
          if (isUsedInTestOrUpdate) break;

          const [replacement] = path.insertBefore(
            t.variableDeclaration('var', [declarator]),
          );
          binding.path = replacement.get('declarations.0');
          declarations.shift();
          i--;
          this.changes++;
        }

        if (declarations.length === 0) path.get('init').remove();
      },
    },
  }),
} satisfies Transform;
