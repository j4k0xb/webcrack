import generate from '@babel/generator';
import { parse } from '@babel/parser';
import { expect } from 'vitest';

export function expectTransform(input: string) {
  const ast = parse(input);
  expect.getState().transform(ast);
  // options.transform(ast);
  return expect(generate(ast).code);
}
