import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { Node } from '@babel/types';
import { Transform } from '.';

export default {
  name: 'numberExpressions',
  tags: ['unsafe', 'readability'],
  visitor: () => ({
    BinaryExpression(path) {
      if (onlyHasNumericLiteralChildren(path.node)) {
        path.replaceWith(t.numericLiteral(eval(path.toString())));
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;

const ALLOWED_TYPES = ['BinaryExpression', 'UnaryExpression', 'NumericLiteral'];

function onlyHasNumericLiteralChildren(node: Node): boolean {
  let valid = true;
  traverse(node, {
    enter(path) {
      if (!ALLOWED_TYPES.includes(path.type)) {
        valid = false;
        path.stop();
      }
    },
    noScope: true,
  });
  return valid;
}
