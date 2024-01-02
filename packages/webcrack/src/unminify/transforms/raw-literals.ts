import type { Transform } from '../../ast-utils';

export default {
  name: 'raw-literals',
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
  }),
} satisfies Transform;
