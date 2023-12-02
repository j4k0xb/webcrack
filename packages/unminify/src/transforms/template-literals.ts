import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { Transform } from '@webcrack/ast-utils';

function escape(str: string) {
  return str.replaceAll('`', '\\`').replaceAll('${', '\\${');
}

function hasEscapedChar(str: string) {
  return str.includes('\\`') || str.includes('\\$');
}

export default {
  name: 'template-literals',
  tags: ['safe'],
  visitor() {
    const noLiteral = m.matcher<t.Expression>((node) => !t.isLiteral(node));

    const concatMatcher = m.or(
      m.binaryExpression('+', noLiteral, m.stringLiteral()),
      m.binaryExpression('+', m.stringLiteral(), noLiteral),
    );
    const templateConcatMatcher = m.binaryExpression('+', m.templateLiteral());

    return {
      StringLiteral(path) {
        // Heuristic: source code most likely used a template literal if it contains multiple lines
        if (!/\n.*?\n/.test(path.node.value)) return;
        if (hasEscapedChar(path.node.value)) return;
        if (concatMatcher.match(path.parent)) return;

        const raw = escape(path.node.value);
        const quasi = t.templateElement({ raw });
        path.replaceWith(t.templateLiteral([quasi], []));
        this.changes++;
      },
      BinaryExpression: {
        exit(path) {
          if (concatMatcher.match(path.node)) {
            const emptyQuasi = t.templateElement({ raw: '' });
            const template = t.templateLiteral([emptyQuasi], []);

            if (path.node.left.type === 'StringLiteral') {
              if (hasEscapedChar(path.node.left.value)) return;
              // 'a' + b -> `a${b}`

              const raw = escape(path.node.left.value);
              template.quasis.unshift(t.templateElement({ raw }));
              template.expressions.push(path.node.right);
            } else if (path.node.right.type === 'StringLiteral') {
              if (hasEscapedChar(path.node.right.value)) return;
              // a + 'b' -> `${a}b`

              const raw = escape(path.node.right.value);
              template.quasis.push(t.templateElement({ raw }));
              template.expressions.push(path.node.left as t.Expression);
            }
            path.replaceWith(template);
            this.changes++;
          } else if (templateConcatMatcher.match(path.node)) {
            const expression = (path.node as t.BinaryExpression).right;
            const template = (path.node as t.BinaryExpression)
              .left as t.TemplateLiteral;

            if (expression.type === 'StringLiteral') {
              if (hasEscapedChar(expression.value)) return;
              // `a${b}` + 'c' -> `a${b}c`

              const raw = escape(expression.value);
              const quasi = t.templateElement({ raw });
              if (template.quasis.at(-1)?.value.raw === '') {
                template.quasis.pop();
              }
              template.quasis.push(quasi);
            } else {
              // `a${b}` + c -> `a${b}${c}`
              template.expressions.push(expression);
              template.quasis.push(t.templateElement({ raw: '' }));
            }

            path.replaceWith(template);
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
