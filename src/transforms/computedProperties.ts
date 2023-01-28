import traverse from '@babel/traverse';
import * as t from '@babel/types';

export default (ast: t.Node) => {
  traverse(ast, {
    MemberExpression(path) {
      const { node } = path;

      if (
        node.computed &&
        t.isStringLiteral(node.property) &&
        t.isValidIdentifier(node.property.value)
      ) {
        node.computed = false;
        node.property = t.identifier(node.property.value);
      }
    },
  });
};
