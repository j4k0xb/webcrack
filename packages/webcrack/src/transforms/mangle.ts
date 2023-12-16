import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import mangle from 'babel-plugin-minify-mangle-names';
import { Transform } from '../ast-utils';

export default {
  name: 'mangle',
  tags: ['safe'],
  scope: true,
  run(ast) {
    // path.hub is undefined for some reason, monkey-patch to avoid error...
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { getSource } = NodePath.prototype;
    NodePath.prototype.getSource = () => '';

    traverse(ast, mangle({ types: t, traverse }).visitor, undefined, {
      opts: {
        eval: true,
        topLevel: true,
        exclude: { React: true },
      },
    });

    NodePath.prototype.getSource = getSource;
  },
} satisfies Transform;
