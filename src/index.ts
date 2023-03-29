import generate from '@babel/generator';
import { parse } from '@babel/parser';
import * as m from '@codemod/matchers';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import deobfuscator from './deobfuscator';
import debugProtection from './deobfuscator/debugProtection';
import selfDefending from './deobfuscator/selfDefending';
import { Bundle, extractBundle } from './extractor';
import { applyTransform, applyTransforms } from './transforms';
import { resetRunState } from './transforms/index';

export interface WebcrackResult {
  code: string;
  bundle: Bundle | undefined;
  /**
   * Save the deobufscated code and the extracted bundle to the given directory.
   * @param path Output directory
   */
  save(path: string): Promise<void>;
}

export interface Options {
  /**
   * Run for every module after generating the code and before saving it.
   * This can be used to format the code or apply other transformations.
   */
  transformCode?: (code: string) => Promise<string> | string;
  /**
   * Assigns paths to modules based on the given matchers.
   * This will also rewrite `require()` calls to use the new paths.
   *
   * @example
   * ```js
   * m => ({
   *   './utils/color.js': m.regExpLiteral('^#([0-9a-f]{3}){1,2}$')
   * })
   * ```
   */
  mappings?: (
    m: typeof import('@codemod/matchers')
  ) => Record<string, m.Matcher<any>>;
  /**
   * Maximum number of iterations for readability transforms.
   */
  maxIterations?: number;
}

export const defaultOptions = {
  maxIterations: 5,
} satisfies Options;

export async function webcrack(
  code: string,
  options: Options = defaultOptions
): Promise<WebcrackResult> {
  const ast = parse(code, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
  });

  applyTransform(ast, deobfuscator);

  resetRunState();
  for (
    let i = 1;
    i <= (options.maxIterations ?? defaultOptions.maxIterations);
    i++
  ) {
    console.log('\n== Iteration', i, '==');
    if (applyTransforms(ast, ['readability']).changes === 0) break;
  }

  // Have to run this after readability transforms because the function may contain dead code
  applyTransform(ast, selfDefending);
  applyTransform(ast, debugProtection);

  resetRunState();

  const bundle = extractBundle(ast);
  console.log('Bundle:', bundle?.type);

  let outputCode = generate(ast).code;
  outputCode = options.transformCode
    ? await options.transformCode(outputCode)
    : outputCode;

  return {
    code: outputCode,
    bundle,
    async save(path) {
      await mkdir(path, { recursive: true });
      await writeFile(join(path, 'deobfuscated.js'), outputCode, 'utf8');
      bundle?.save(path, options.transformCode, options.mappings);
    },
  };
}
