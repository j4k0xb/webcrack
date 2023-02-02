import generate from '@babel/generator';
import { parse } from '@babel/parser';
import * as m from '@codemod/matchers';
import { mkdirSync, writeFileSync } from 'node:fs';
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
  save(path: string): void;
}

export interface Options {
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

export function webcrack(code: string, options: Options = {}): WebcrackResult {
  const ast = parse(code, { sourceType: 'unambiguous' });

  applyTransform(ast, deobfuscator);
  applyTransforms(ast, ['readability']);

  const bundle = extractBundle(ast);
  if (bundle && options.mappings) bundle.applyMappings(options.mappings(m));
  bundle?.replaceRequireCalls();
  console.log('Bundle:', bundle);

  const outputCode = generate(ast).code;

  return {
    code: outputCode,
    bundle,
    save(path) {
      mkdirSync(path, { recursive: true });
      writeFileSync(join(path, 'deobfuscated.js'), outputCode, 'utf8');
      bundle?.save(path);
    },
  };
}
