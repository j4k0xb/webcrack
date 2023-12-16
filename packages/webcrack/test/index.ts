import { ParseResult, parse } from '@babel/parser';
import { Assertion, expect } from 'vitest';
import { Transform, applyTransform } from '../src/ast-utils';

export function testTransform<Options>(
  transform: Transform<Options>,
): (input: string, options?: Options) => Assertion<ParseResult<File>> {
  return (input, options) => {
    const ast = parse(input, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
    });
    applyTransform(ast, transform, options);
    return expect(ast);
  };
}
