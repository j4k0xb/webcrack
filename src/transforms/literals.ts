import { Transform } from '.';

export default {
  name: 'literals',
  tags: ['safe', 'formatting'],
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
