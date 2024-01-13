import { ParseResult, parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Assertion, expect } from 'vitest';
import { Transform, applyTransform } from '../../ast-utils';

/**
 * Test a transform with the input being wrapped with
 * ```js
 * (function(__webpack_module__, __webpack_exports__, __webpack_require__) {
 *  // input
 * });
 * ```
 *
 * @param transform the transform to apply
 * @param cb specify the options that will be passed to the transform
 */
export function testWebpackModuleTransform<Options>(
  transform: Transform<Options>,
  cb?: (wrapperPath: NodePath<t.FunctionExpression>, ast: t.File) => Options,
): (input: string) => Assertion<ParseResult<File>> {
  return (input) => {
    const moduleCode = `
      (function(__webpack_module__, __webpack_exports__, __webpack_require__) {
        ${input}
      });
    `;
    const ast = parse(moduleCode, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
    });
    let innerAST: t.File;
    traverse(ast, {
      FunctionExpression(path) {
        path.stop();
        innerAST = t.file(t.program(path.node.body.body));
        const options = cb?.(path, innerAST);
        applyTransform(innerAST, transform, options);
      },
    });
    return expect(innerAST!);
  };
}
