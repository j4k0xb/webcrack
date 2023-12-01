import * as t from "@babel/types";
import * as m from "@codemod/matchers";
import { Transform } from "@webcrack/ast-utils";

// https://eslint.org/docs/latest/rules/yoda and https://babeljs.io/docs/en/babel-plugin-minify-flip-comparisons

const flippedOperators = {
  "==": "==",
  "===": "===",
  "!=": "!=",
  "!==": "!==",
  ">": "<",
  "<": ">",
  ">=": "<=",
  "<=": ">=",
  "*": "*",
  "^": "^",
  "&": "&",
  "|": "|",
} as const;

export default {
  name: "yoda",
  tags: ["safe"],
  visitor: () => {
    const matcher = m.binaryExpression(
      m.or(...Object.values(flippedOperators)),
      m.or(
        m.stringLiteral(),
        m.numericLiteral(),
        m.unaryExpression("-", m.numericLiteral()),
        m.booleanLiteral(),
        m.nullLiteral(),
        m.identifier("undefined"),
        m.identifier("NaN"),
        m.identifier("Infinity"),
      ),
      m.matcher((node) => !t.isLiteral(node)),
    );

    return {
      BinaryExpression: {
        exit({ node }) {
          if (matcher.match(node)) {
            [node.left, node.right] = [node.right, node.left as t.Expression];
            node.operator =
              flippedOperators[node.operator as keyof typeof flippedOperators];
            this.changes++;
          }
        },
      },
    };
  },
} satisfies Transform;
