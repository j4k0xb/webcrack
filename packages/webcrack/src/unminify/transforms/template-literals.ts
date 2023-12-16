import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform, constMemberExpression } from '../../ast-utils';

// https://github.com/babel/babel/pull/5791
// https://github.com/babel/babel/blob/cce807f1eb638ee3030112dc190cbee032760888/packages/babel-plugin-transform-template-literals/src/index.ts

// TODO: option ignoreToPrimitiveHint (uses `+` instead of concat)

function escape(str: string) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
}

function flattenConcats(node: t.CallExpression) {
  const parts: t.Expression[] = [];
  let current: t.Expression = node;
  while (current.type === 'CallExpression') {
    parts.unshift(...(current.arguments as t.Expression[]));
    current = (current.callee as t.MemberExpression).object;
  }
  parts.unshift(current);
  return parts;
}

export default {
  name: 'template-literals',
  tags: ['unsafe'],
  visitor() {
    const concatMatcher: m.Matcher<t.CallExpression> = m.or(
      m.callExpression(
        constMemberExpression(
          m.or(
            m.stringLiteral(),
            m.matcher((node) => concatMatcher.match(node)),
          ),
          'concat',
        ),
        m.arrayOf(m.anyExpression()),
      ),
    );

    return {
      StringLiteral(path) {
        // Heuristic: source code most likely used a template literal if it contains multiple lines
        if (!/\n.*?\n/.test(path.node.value)) return;
        if (concatMatcher.match(path.parentPath.parent)) return;

        const raw = escape(path.node.value);
        const quasi = t.templateElement({ raw });
        path.replaceWith(t.templateLiteral([quasi], []));
        this.changes++;
      },
      CallExpression: {
        exit(path) {
          if (
            concatMatcher.match(path.node) &&
            !concatMatcher.match(path.parentPath.parent)
          ) {
            const parts = flattenConcats(path.node);
            const quasis: t.TemplateElement[] = [];
            const expressions: t.Expression[] = [];

            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              const nextPart = parts[i + 1];
              const followedByString = nextPart?.type === 'StringLiteral';

              if (part.type === 'StringLiteral') {
                if (followedByString) {
                  nextPart.value = part.value + nextPart.value;
                } else {
                  quasis.push(t.templateElement({ raw: escape(part.value) }));
                }
              } else {
                expressions.push(part);
                if (!followedByString) {
                  quasis.push(t.templateElement({ raw: '' }));
                }
              }
            }

            const template = t.templateLiteral(quasis, expressions);
            path.replaceWith(template);
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
