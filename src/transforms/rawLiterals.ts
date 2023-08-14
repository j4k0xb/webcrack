import { Transform } from '.';

export default {
  name: 'rawLiterals',
  tags: ['safe'],
  visitor: () => ({
    StringLiteral(path) {
      if (path.node.extra) {
        path.node.extra.raw = JSON.stringify(path.node.extra.rawValue);
      } else {
        path.node.extra = {
          rawValue: path.node.value,
          raw: JSON.stringify(path.node.value),
        };
      }
      this.changes++;
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
