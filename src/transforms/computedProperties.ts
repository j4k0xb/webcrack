import * as t from '@babel/types';
import { Transform } from '.';

export default {
  name: 'computedProperties',
  tags: ['safe', 'readability'],
  visitor: () => ({
    MemberExpression(path) {
      const { node } = path;

      if (
        node.computed &&
        t.isStringLiteral(node.property) &&
        isValidProperty(node.property.value)
      ) {
        node.computed = false;
        node.property = t.identifier(node.property.value);
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;

function isValidProperty(name: string) {
  return /^(?!\d)[\w$]+$/.test(name);
}
