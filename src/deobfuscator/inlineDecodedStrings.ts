import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '../transforms';
import numberExpressions from '../transforms/numberExpressions';
import { VMDecoder } from './vm';

/**
 * Replaces calls to decoder functions with the decoded string.
 * E.g. `m(199)` -> `'log'`
 */
export default {
  name: 'inlineDecodedStrings',
  tags: ['unsafe'],
  preTransforms: [numberExpressions],
  run(ast, state, options) {
    if (!options) return;

    const calls = collectCalls(ast, options.vm);
    const decodedStrings = options.vm.decode(calls);

    calls.forEach((path, i) => {
      if (typeof decodedStrings[i] === 'string') {
        path.replaceWith(t.stringLiteral(decodedStrings[i]));
      } else {
        path.replaceWith(t.identifier('undefined'));
        path.addComment('leading', 'webcrack:decode_error');
      }
    });

    state.changes += calls.length;
  },
} satisfies Transform<{ vm: VMDecoder }>;

function collectCalls(ast: t.Node, vm: VMDecoder) {
  const calls: NodePath<t.CallExpression>[] = [];

  const decoderName = m.capture(
    m.matcher<string>(name => vm.decoders.some(d => d.name === name))
  );
  const matcher = m.callExpression(
    m.identifier(decoderName),
    m.arrayOf(
      m.or(
        m.stringLiteral(),
        m.or(m.unaryExpression('-', m.numericLiteral()), m.numericLiteral())
      )
    )
  );

  traverse(ast, {
    CallExpression(path) {
      if (matcher.match(path.node)) {
        calls.push(path);
      }
    },
    noScope: true,
  });

  return calls;
}
