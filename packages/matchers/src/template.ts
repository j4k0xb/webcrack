import { parse, parseExpression, type ParserOptions } from '@babel/parser';
import * as t from '@babel/types';
import type { Schema } from './types';
import { any, capture, type NodeSchema } from './types.js';

export function expression(
  strings: TemplateStringsArray,
  ...schemas: Schema<unknown>[]
): NodeSchema<t.Expression> {
  return parseTemplate(
    strings,
    schemas,
    parseExpression,
  ) as NodeSchema<t.Expression>;
}

export function statement(
  strings: TemplateStringsArray,
  ...schemas: Schema<unknown>[]
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
  schemas: Schema<unknown>[],
  parse: (input: string, options?: ParserOptions) => t.Node,
): NodeSchema<t.Node> {
  let schemaIndex = 0;
  const metaVariables = new Map<string, number>();

  const pattern = strings.reduce((acc, curr, i) => {
    acc += curr;

    if (i < schemas.length) {
      acc += `$${schemaIndex++}`;
    }

    return acc;
  }, '');

  function isPlaceholder(node: t.Node): node is t.Identifier {
    return t.isIdentifier(node) && /^\$\d+$/.test(node.name);
  }

  function isMetaVariable(node: t.Node): node is t.Identifier {
    return t.isIdentifier(node) && /^\$[A-Z_][A-Z0-9_]*$/.test(node.name);
  }

  const ast = parse(pattern);
  let rootSchema: NodeSchema<t.Node> | undefined;
  t.traverse(ast, {
    enter(node, ancestors) {
      function replace(
        ancestor: { node: t.Node; key: string; index?: number },
        value?: unknown,
      ) {
        if (ancestor) {
          const container = ancestor.node[ancestor.key as keyof t.Node];
          if (Array.isArray(container)) {
            container[ancestor.index!] = value as never;
          } else {
            ancestor.node[ancestor.key as keyof t.Node] = value as never;
          }
        } else {
          rootSchema = value as NodeSchema<t.Node>;
        }
      }

      if (isMetaVariable(node)) {
        const name = node.name.slice(1);
        metaVariables.set(name, schemaIndex);
        replace(ancestors.at(-1)!, capture(name));
      }

      if (!isPlaceholder(node)) return;
      const schema = schemas[Number(node.name.slice(1))];

      if (ancestors.length === 0) {
        rootSchema = schema as never;
        return;
      }

      if (
        ancestors.length >= 2 &&
        t.isExpressionStatement(ancestors.at(-1)!.node) &&
        schema === any
      ) {
        replace(ancestors.at(-2)!, any);
      } else {
        replace(ancestors.at(-1)!, schema);
      }
    },
  });

  return rootSchema ?? ast;
}
