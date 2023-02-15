import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../transforms';
import numberExpressions from '../transforms/numberExpressions';
import { Decoder } from './decoder';

export default {
  name: 'inlineDecodedStrings',
  tags: ['unsafe'],
  preTransforms: [numberExpressions],
  visitor: options => ({
    CallExpression(path) {
      options?.decoders.forEach(decoder => {
        const matcher = m.callExpression(m.identifier(decoder.name), m.anything());

        if (matcher.match(path.node) && t.isLiteral(path.node.arguments[0])) {
          const args = path.node.arguments.map(arg => {
            if (t.isNumericLiteral(arg) || t.isStringLiteral(arg)) {
              return arg.value;
            }
          });

          let decoded = options.vm.decode(decoder, args);
          path.replaceWith(decoded ? t.stringLiteral(decoded) : t.identifier(String(decoded)));
          this.changes++;
        }
      });
    },
    noScope: true,
  }),
} satisfies Transform<{ decoders: Decoder[]; vm: any }>;
