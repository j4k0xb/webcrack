import type { GeneratorOptions } from '@babel/generator';
import babelGenerate from '@babel/generator';
import type * as t from '@babel/types';

const defaultOptions: GeneratorOptions = { jsescOption: { minimal: true } };

export function generate(
  ast: t.Node,
  options: GeneratorOptions = defaultOptions,
): string {
  return babelGenerate(ast, options).code;
}

export function codePreview(node: t.Node): string {
  const code = generate(node, {
    minified: true,
    shouldPrintComment: () => false,
    ...defaultOptions,
  });
  if (code.length > 100) {
    return code.slice(0, 70) + ' … ' + code.slice(-30);
  }
  return code;
}
