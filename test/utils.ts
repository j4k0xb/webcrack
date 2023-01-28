import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { expect } from 'vitest';
import { Transform } from '../src/transforms';

export function transformer(transform: Transform) {
  return (actualCode: string) => {
    const ast = parse(actualCode);
    traverse(ast, transform.visitor, undefined, { changes: 0 });
    return expect(ast);
  };
}
