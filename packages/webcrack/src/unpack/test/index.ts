import type { ParseResult } from '@babel/parser';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Assertion } from 'vitest';
import { expect } from 'vitest';
import { WebpackModule } from '../webpack/module';

/**
 * Test all transforms with the input being wrapped with
 * ```js
 * (function(__webpack_module__, __webpack_exports__, __webpack_require__) {
 *  // input
 * });
 * ```
 */
export function testWebpackModuleTransform(): (
  input: string,
) => Assertion<ParseResult<File>> {
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
    let file: t.File;
    traverse(ast, {
      FunctionExpression(path) {
        path.stop();
        file = t.file(t.program(path.node.body.body));
        const module = new WebpackModule('test', path, true);
        module.applyTransforms((moduleId) => moduleId);
      },
    });
    return expect(file!);
  };
}
