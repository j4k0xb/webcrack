import generate from '@babel/generator';
import { parse } from '@babel/parser';
import * as t from '@babel/types';
import { expect } from 'vitest';

export function transformer(transform: (ast: t.Node) => void) {
  return (actualCode: string) => {
    const ast = parse(actualCode);
    transform(ast);
    return expect(generate(ast).code);
  };
}
