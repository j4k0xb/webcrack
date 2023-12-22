import * as t from '@babel/types';
import { Transform } from '../../ast-utils';

export default {
  name: 'split-variable-declarations',
  tags: ['safe'],
  visitor: () => ({
    VariableDeclaration: {
      exit(path) {
        if (path.node.declarations.length > 1) {
          // E.g. for (let i = 0, j = 1;;)
          if (path.key === 'init' && path.parentPath.isForStatement()) {
            if (!path.parentPath.node.test && !path.parentPath.node.update) {
              path.parentPath.insertBefore(
                path.node.declarations.map((declaration) =>
                  t.variableDeclaration(path.node.kind, [declaration]),
                ),
              );
              path.remove();
              this.changes++;
            }
          } else {
            if (path.parentPath.isExportNamedDeclaration()) {
              path.parentPath.replaceWithMultiple(
                path.node.declarations.map((declaration) =>
                  t.exportNamedDeclaration(
                    t.variableDeclaration(path.node.kind, [declaration]),
                  ),
                ),
              );
            } else {
              path.replaceWithMultiple(
                path.node.declarations.map((declaration) =>
                  t.variableDeclaration(path.node.kind, [declaration]),
                ),
              );
            }
            this.changes++;
          }
        }
      },
    },
  }),
} satisfies Transform;
