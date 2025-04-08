import { parse, parseExpression, type ParserOptions } from '@babel/parser';
import * as t from '@babel/types';
import { type NodeSchema } from './types.js';

export function expression(
  strings: TemplateStringsArray,
  ...schemas: NodeSchema<t.Node>[]
): NodeSchema<t.Expression> {
  return parseTemplate(
    strings,
    schemas,
    parseExpression,
  ) as NodeSchema<t.Expression>;
}

export function statement(
  strings: TemplateStringsArray,
  ...schemas: NodeSchema<t.Statement>[]
): NodeSchema<t.Statement> {
  return parseTemplate(
    strings,
    schemas,
    parseStatement,
  ) as NodeSchema<t.Statement>;
}

function parseStatement(input: string) {
  return parse(input, { allowReturnOutsideFunction: true }).program.body[0];
}

function parseTemplate(
  strings: TemplateStringsArray,
  schemas: NodeSchema<t.Node>[],
  parse: (input: string, options?: ParserOptions) => t.Node,
): NodeSchema<t.Node> {
  let schemaIndex = 0;
  const pattern = strings.reduce((acc, curr, i) => {
    acc += curr;

    if (schemas[i]) {
      acc += `$${schemaIndex++}`;
    }

    return acc;
  }, '');

  const ast = parse(pattern);
  let rootSchema: NodeSchema<t.Node> | undefined;
  t.traverse(ast, {
    enter(node, ancestors) {
      if (!t.isIdentifier(node)) return;
      if (!/^\$\d+$/.test(node.name)) return;
      const matcher = schemas[Number(node.name.slice(1))];
      const ancestor = ancestors.at(-1);
      if (ancestor) {
        const container = ancestor.node[ancestor.key as keyof t.Node];
        if (Array.isArray(container)) {
          container[ancestor.index!] = matcher as never;
        } else {
          ancestor.node[ancestor.key as keyof t.Node] = matcher as never;
        }
      } else {
        rootSchema = matcher;
      }
    },
  });

  return rootSchema ?? ast;
}
