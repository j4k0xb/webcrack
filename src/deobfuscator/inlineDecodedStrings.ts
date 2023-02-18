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

    calls.forEach(({ path }, i) => {
      if (decodedStrings[i] === undefined) {
        path.replaceWith(t.identifier('undefined'));
        path.addComment('leading', 'webcrack:decode_error');
      } else {
        path.replaceWith(t.stringLiteral(decodedStrings[i]));
      }
    });

    state.changes += calls.length;
  },
} satisfies Transform<{ vm: VMDecoder }>;

function collectCalls(ast: t.Node, vm: VMDecoder) {
  const calls: {
    path: NodePath<t.CallExpression>;
    decoder: string;
    args: unknown[];
  }[] = [];

  const decoderName = m.capture(
    m.matcher<string>(name => vm.decoders.some(d => d.name === name))
  );
  const args = m.capture(
    m.arrayOf(m.or(m.stringLiteral(), m.numericLiteral()))
  );
  const matcher = m.callExpression(m.identifier(decoderName), args);

  traverse(ast, {
    CallExpression(path) {
      if (matcher.match(path.node)) {
        calls.push({
          path,
          decoder: decoderName.current!,
          args: args.current!.map(a => a.value),
        });
      }
    },
    noScope: true,
  });

  return calls;
}
