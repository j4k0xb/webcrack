import babelGenerate, { GeneratorOptions } from '@babel/generator';
import * as t from '@babel/types';

const defaultOptions: GeneratorOptions = { jsescOption: { minimal: true } };

export function generate(
  ast: t.Node,
  options: GeneratorOptions = defaultOptions
): string {
  return babelGenerate(ast, options).code;
}
