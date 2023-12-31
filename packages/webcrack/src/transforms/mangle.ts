import { statement } from '@babel/template';
import traverse, { NodePath, Visitor, visitors } from '@babel/traverse';
import * as t from '@babel/types';
import mangle from 'babel-plugin-minify-mangle-names';
import { Transform } from '../ast-utils';

// See https://github.com/j4k0xb/webcrack/issues/41 and https://github.com/babel/minify/issues/1023
const fixDefaultParamError: Visitor = {
  Function(path) {
    const { params } = path.node;
    for (let i = params.length - 1; i >= 0; i--) {
      const param = params[i];
      if (
        !t.isAssignmentPattern(param) ||
        !t.isIdentifier(param.left) ||
        t.isLiteral(param.right)
      )
        continue;

      if (
        path.isArrowFunctionExpression() &&
        !t.isBlockStatement(path.node.body)
      ) {
        path.node.body = t.blockStatement([t.returnStatement(path.node.body)]);
      }
      (path.get('body') as NodePath<t.BlockStatement>).unshiftContainer(
        'body',
        statement`if (${param.left} !== undefined) ${param.left} = ${param.right}`(),
      );
      param.right = t.identifier('undefined');
    }
  },
};

export default {
  name: 'mangle',
  tags: ['safe'],
  scope: true,
  run(ast) {
    // path.hub is undefined for some reason, monkey-patch to avoid error...
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { getSource } = NodePath.prototype;
    NodePath.prototype.getSource = () => '';
    const visitor = visitors.merge([
      fixDefaultParamError,
      mangle({ types: t, traverse }).visitor,
    ]);

    traverse(ast, visitor, undefined, {
      opts: {
        eval: true,
        topLevel: true,
        exclude: { React: true },
      },
    });

    NodePath.prototype.getSource = getSource;
  },
} satisfies Transform;
