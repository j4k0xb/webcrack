import { Transform } from '.';

export default {
  name: 'rawLiterals',
  tags: ['safe', 'readability'],
  visitor: () => ({
    StringLiteral(path) {
      delete path.node.extra;
      this.changes++;
    },
    NumericLiteral(path) {
      delete path.node.extra;
      this.changes++;
    },
    noScope: true,
  }),
} satisfies Transform;
