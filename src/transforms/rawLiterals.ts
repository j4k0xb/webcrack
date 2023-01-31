import { Transform } from '.';

export default {
  name: 'rawLiterals',
  tags: ['safe', 'readability'],
  visitor: () => ({
    StringLiteral(path) {
      if (path.node.extra) {
        delete path.node.extra;
        this.changes++;
      }
    },
    NumericLiteral(path) {
      if (path.node.extra) {
        delete path.node.extra;
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;
