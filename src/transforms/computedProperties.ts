import * as t from '@babel/types';
import { Tag, Transform } from '.';

export default {
  name: 'computedProperties',
  tags: [Tag.SAFE, Tag.PREPROCESS],
  visitor: {
    MemberExpression(path) {
      const { node } = path;

      if (
        node.computed &&
        t.isStringLiteral(node.property) &&
        t.isValidIdentifier(node.property.value)
      ) {
        node.computed = false;
        node.property = t.identifier(node.property.value);
        this.changes++;
      }
    },
    noScope: true,
  },
} satisfies Transform;
