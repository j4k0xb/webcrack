import * as t from '@babel/types';
import { Tag, Transform } from '.';

export default {
  name: 'splitVariableDeclarations',
  tags: [Tag.SAFE, Tag.PREPROCESS],
  visitor: {
    VariableDeclaration(path) {
      if (path.node.declarations.length > 1) {
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
