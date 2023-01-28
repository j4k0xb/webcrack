import traverse from '@babel/traverse';
import * as t from '@babel/types';

export default (ast: t.Node) => {
  traverse(ast, {
    VariableDeclaration(path) {
      if (path.node.declarations.length > 1) {
        path.replaceWithMultiple(
          path.node.declarations.map(declaration =>
            t.variableDeclaration(path.node.kind, [declaration])
          )
        );
      }
    },
  });
};
