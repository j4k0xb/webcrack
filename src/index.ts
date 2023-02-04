import generate from '@babel/generator';
import { parse } from '@babel/parser';
import * as m from '@codemod/matchers';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import deobfuscator from './deobfuscator';
import { Bundle, extractBundle } from './extractor';
import { applyTransform, applyTransforms } from './transforms';

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
}

export default webcrack;

export async function webcrack(
  code: string,
  options: Options = {}
): Promise<WebcrackResult> {
  const ast = parse(code, { sourceType: 'unambiguous' });

  applyTransform(ast, deobfuscator);
  applyTransforms(ast, ['readability']);

  const bundle = extractBundle(ast);
  if (bundle && options.mappings) bundle.applyMappings(options.mappings(m));
  bundle?.replaceRequireCalls();
  console.log('Bundle:', bundle);

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
      bundle?.save(path, options.transformCode);
    },
  };
}
