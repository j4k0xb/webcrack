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
    ObjectProperty(path) {
      const { node } = path;

      if (
        node.computed &&
        t.isStringLiteral(node.key) &&
        isValidProperty(node.key.value)
      ) {
        node.computed = false;
        node.key = t.identifier(node.key.value);
        this.changes++;
      }
    },
    ObjectMethod(path) {
      const { node } = path;

      if (
        node.computed &&
        t.isStringLiteral(node.key) &&
        isValidProperty(node.key.value)
      ) {
        node.computed = false;
        node.key = t.identifier(node.key.value);
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;

function isValidProperty(name: string) {
  return /^(?!\d)[\w$]+$/.test(name);
}
