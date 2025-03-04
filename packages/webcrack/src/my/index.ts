import * as t from '@babel/types';
import type { Transform } from '../ast-utils';


export const MyJSX = {
  name: 'jsx_s-statements',
  tags: ['safe'],
  visitor: () => ({
    CallExpression(path) {
      if (path.node.callee.type != 'SequenceExpression') {
        return;
      }
      if (
        path.node.callee.expressions.length == 2 &&
        path.node.callee.expressions[0].type == 'NumericLiteral'
      ) {
        path.node.callee = path.node.callee.expressions[1];
        if (path.node.callee.type === 'MemberExpression') {
          const name = (path.node.callee.property as t.Identifier).name;
          if (name === 'jsx' || name == 'jsxs')
            path.node.callee = path.node.callee.property as t.Identifier;
        }
      }
    },
  }),
} satisfies Transform;


