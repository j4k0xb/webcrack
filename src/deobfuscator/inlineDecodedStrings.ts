import { expression } from '@babel/template';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform, applyTransform } from '../transforms';
import numberExpressions from '../transforms/numberExpressions';
import { VMDecoder } from './vm';

/**
 * Replaces calls to decoder functions with the decoded string.
 * E.g. `m(199)` -> `'log'`
 */
export default {
  name: 'inlineDecodedStrings',
  tags: ['unsafe'],
  run(ast, state, options) {
    if (!options) return;
    applyTransform(ast, numberExpressions);

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

  const conditional = m.capture(m.conditionalExpression());
  const conditionalMatcher = m.callExpression(m.identifier(decoderName), [
    conditional,
  ]);

  traverse(ast, {
    CallExpression(path) {
      // decode(test ? 1 : 2) -> test ? decode(1) : decode(2)
      if (conditionalMatcher.match(path.node)) {
        const { callee } = path.node;
        const { test, consequent, alternate } = conditional.current!;

        path.replaceWith(
          expression`${test} ? ${callee}(${consequent}) : ${callee}(${alternate})`()
        );
      } else if (matcher.match(path.node)) {
        calls.push(path);
      }
    },
    noScope: true,
  });

  return calls;
}
