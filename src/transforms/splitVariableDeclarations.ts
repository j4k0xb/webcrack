import * as t from '@babel/types';
import { Transform } from '.';

export default {
  name: 'splitVariableDeclarations',
  tags: ['safe', 'preprocess'],
  visitor: {
    // FIXME: dont in for loops
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
  },
} satisfies Transform;
