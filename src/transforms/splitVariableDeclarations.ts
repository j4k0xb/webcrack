import * as t from '@babel/types';
import { Transform } from '.';

export default {
  name: 'splitVariableDeclarations',
  tags: ['safe', 'readability', 'once'],
  visitor: () => ({
    VariableDeclaration(path) {
      if (
        path.node.declarations.length > 1 &&
        !(path.parentPath.isForStatement() && path.key === 'init')
      ) {
        path.replaceWithMultiple(
          path.node.declarations.map(declaration =>
            t.variableDeclaration(path.node.kind, [declaration])
          )
        );
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;
