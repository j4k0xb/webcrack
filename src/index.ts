import generate from '@babel/generator';
import { parse } from '@babel/parser';
import * as m from '@codemod/matchers';
import debug from 'debug';
import { join, normalize } from 'node:path';
import deobfuscator from './deobfuscator';
import debugProtection from './deobfuscator/debugProtection';
import mergeObjectAssignments from './deobfuscator/mergeObjectAssignments';
import selfDefending from './deobfuscator/selfDefending';
import {
  Sandbox,
  createBrowserSandbox,
  createNodeSandbox,
} from './deobfuscator/vm';
import { unpackBundle } from './extractor';
import { Bundle } from './extractor/bundle';
import {
  applyTransform,
  applyTransformAsync,
  applyTransforms,
} from './transforms';
import blockStatement from './transforms/blockStatement';
import jsx from './transforms/jsx';
import jsxNew from './transforms/jsx-new';
import mangle from './transforms/mangle';
import sequence from './transforms/sequence';
import splitVariableDeclarations from './transforms/splitVariableDeclarations';
import unminify from './transforms/unminify';

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
   * Decompile react components to JSX.
   * @default true
   */
  jsx?: boolean;
  /**
   * Extract modules from the bundle.
   * @default true
   */
  unpack?: boolean;
  /**
   * Deobfuscate the code.
   * @default true
   */
  deobfuscate?: boolean;
  /**
   * Mangle variable names.
   * @default false
   */
  mangle?: boolean;
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
  ) => Record<string, m.Matcher<unknown>>;
  /**
   * Function that executes a code expression and returns the result (typically from the obfuscator).
   */
  sandbox?: Sandbox;
}

function mergeOptions(options: Options): asserts options is Required<Options> {
  const mergedOptions: Required<Options> = {
    jsx: true,
    unpack: true,
    deobfuscate: true,
    mangle: false,
    mappings: () => ({}),
    sandbox: process.env.browser ? createBrowserSandbox() : createNodeSandbox(),
    ...options,
  };
  Object.assign(options, mergedOptions);
}

export async function webcrack(
  code: string,
  options: Options = {}
): Promise<WebcrackResult> {
  mergeOptions(options);

  if (process.env.browser) {
    debug.enable('webcrack:*');
  }

  const ast = parse(code, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    plugins: ['jsx'],
  });

  applyTransforms(
    ast,
    [blockStatement, sequence, splitVariableDeclarations],
    'prepare'
  );

  if (options.deobfuscate)
    await applyTransformAsync(ast, deobfuscator, options.sandbox);

  // Normally unminify doesn't crawl the scope again, but when deobfuscation is disabled
  // we have to do it for other transforms to work
  const unminifyWrapper: typeof unminify = {
    ...unminify,
    visitor: () => ({ ...unminify.visitor(), noScope: options.deobfuscate }),
  };
  applyTransform(ast, unminifyWrapper);

  if (options.mangle) applyTransform(ast, mangle);

  // TODO: Also merge unminify visitor (breaks selfDefending/debugProtection atm)
  applyTransforms(
    ast,
    [
      // Have to run this after unminify to properly detect it
      options.deobfuscate ? [selfDefending, debugProtection] : [],
      options.jsx ? [jsx, jsxNew] : [],
    ].flat()
  );

  if (options.deobfuscate) applyTransform(ast, mergeObjectAssignments);

  // Unpacking modifies the same AST and may result in imports not at top level
  // so the code has to be generated before
  const outputCode = generate(ast, { jsescOption: { minimal: true } }).code;

  const bundle = options.unpack
    ? unpackBundle(ast, options.mappings(m))
    : undefined;

  return {
    code: outputCode,
    bundle,
    async save(path) {
      path = normalize(path);
      if (process.env.browser) {
        throw new Error('Not implemented.');
      } else {
        const { mkdir, writeFile } = await import('node:fs/promises');
        await mkdir(path, { recursive: true });
        await writeFile(join(path, 'deobfuscated.js'), outputCode, 'utf8');
        await bundle?.save(path);
      }
    },
  };
}
