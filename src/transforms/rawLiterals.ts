import { Transform } from '.';

export default {
  name: 'rawLiterals',
  tags: ['safe'],
  visitor: () => ({
    StringLiteral(path) {
      if (path.node.extra) {
        path.node.extra = undefined;
        this.changes++;
      }
    },
    NumericLiteral(path) {
      if (path.node.extra) {
        path.node.extra = undefined;
        this.changes++;
      }
    },
    noScope: true,
  }),
} satisfies Transform;
