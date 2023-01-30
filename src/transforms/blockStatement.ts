import * as t from '@babel/types';
import { Transform } from '.';

export default {
  name: 'blockStatement',
  tags: ['safe', 'preprocess'],
  visitor: {
    WhileStatement(path) {
      if (!t.isBlockStatement(path.node.body)) {
        path.node.body = t.blockStatement([path.node.body]);
        this.changes++;
      }
    },
    IfStatement(path) {
      if (!t.isBlockStatement(path.node.consequent)) {
        path.node.consequent = t.blockStatement([path.node.consequent]);
        this.changes++;
      }
      if (path.node.alternate && !t.isBlockStatement(path.node.alternate)) {
        path.node.alternate = t.blockStatement([path.node.alternate]);
        this.changes++;
      }
    },
    ForStatement(path) {
      if (!t.isBlockStatement(path.node.body)) {
        path.node.body = t.blockStatement([path.node.body]);
        this.changes++;
      }
    },
    ForInStatement(path) {
      if (!t.isBlockStatement(path.node.body)) {
        path.node.body = t.blockStatement([path.node.body]);
        this.changes++;
      }
    },
    ForOfStatement(path) {
      if (!t.isBlockStatement(path.node.body)) {
        path.node.body = t.blockStatement([path.node.body]);
        this.changes++;
      }
    },
    noScope: true,
  },
} satisfies Transform;
