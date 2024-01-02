import { statement } from '@babel/template';
import type { Visitor } from '@babel/traverse';
import traverse, { NodePath, visitors } from '@babel/traverse';
import * as t from '@babel/types';
import mangle from 'babel-plugin-minify-mangle-names';
import type { Transform } from '../ast-utils';
import { safeLiteral } from '../ast-utils';

// See https://github.com/j4k0xb/webcrack/issues/41 and https://github.com/babel/minify/issues/1023
const fixDefaultParamError: Visitor = {
  Function(path) {
    const { params } = path.node;

    for (let i = params.length - 1; i >= 0; i--) {
      const param = params[i];
      if (!t.isAssignmentPattern(param) || safeLiteral.match(param.right))
        continue;

      if (!t.isBlockStatement(path.node.body)) {
        path.node.body = t.blockStatement([t.returnStatement(path.node.body)]);
      }

      const body = path.get('body') as NodePath<t.BlockStatement>;
      if (t.isIdentifier(param.left)) {
        body.unshiftContainer(
          'body',
          statement`if (${param.left} === undefined) ${param.left} = ${param.right}`(),
        );
      } else {
        const tempId = path.scope.generateUidIdentifier();
        body.unshiftContainer(
          'body',
          statement`var ${param.left} = ${tempId} === undefined ? ${param.right} : ${tempId}`(),
        );
        param.left = tempId;
      }
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
