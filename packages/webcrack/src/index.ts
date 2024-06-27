import type { ParseResult } from '@babel/parser';
import { parse } from '@babel/parser';
import type * as t from '@babel/types';
import type Matchers from '@codemod/matchers';
import * as m from '@codemod/matchers';
import debug from 'debug';
import { join, normalize } from 'node:path';
import {
  applyTransform,
  applyTransformAsync,
  applyTransforms,
  generate,
} from './ast-utils';
import type { Sandbox } from './deobfuscate';
import deobfuscate, {
  createBrowserSandbox,
  createNodeSandbox,
} from './deobfuscate';
import debugProtection from './deobfuscate/debug-protection';
import mergeObjectAssignments from './deobfuscate/merge-object-assignments';
import selfDefending from './deobfuscate/self-defending';
import varFunctions from './deobfuscate/var-functions';
import type { Plugin } from './plugin';
import { loadPlugins } from './plugin';
import jsx from './transforms/jsx';
import jsxNew from './transforms/jsx-new';
import mangle from './transforms/mangle';
import transpile from './transpile';
import unminify from './unminify';
import {
  blockStatements,
  sequence,
  splitVariableDeclarations,
} from './unminify/transforms';
import type { Bundle } from './unpack';
import { unpackAST } from './unpack';
import { isBrowser } from './utils/platform';

export { type Sandbox } from './deobfuscate';
export type { Plugin, PluginAPI, PluginObject, Stage } from './plugin';

type Matchers = typeof m;

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
   * Unminify the code. Required for some of the deobfuscate/unpack/jsx transforms.
   * @default true
   */
  unminify?: boolean;
  /**
   * Mangle variable names.
   * @default false
   */
  mangle?: boolean;
  /**
   * Run AST transformations after specific stages
   */
  plugins?: Plugin[];
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
  mappings?: (m: Matchers) => Record<string, m.Matcher<unknown>>;
  /**
   * Function that executes a code expression and returns the result (typically from the obfuscator).
   */
  sandbox?: Sandbox;
  /**
   * @param progress Progress in percent (0-100)
   */
  onProgress?: (progress: number) => void;
}

function mergeOptions(options: Options): asserts options is Required<Options> {
  const mergedOptions: Required<Options> = {
    jsx: true,
    unminify: true,
    unpack: true,
    deobfuscate: true,
    mangle: false,
    plugins: [],
    mappings: () => ({}),
    onProgress: () => {},
    sandbox: isBrowser() ? createBrowserSandbox() : createNodeSandbox(),
    ...options,
  };
  Object.assign(options, mergedOptions);
}

export async function webcrack(
  code: string,
  options: Options = {},
): Promise<WebcrackResult> {
  mergeOptions(options);
  options.onProgress(0);

  if (isBrowser()) {
    debug.enable('webcrack:*');
  }

  const isBookmarklet = /^javascript:./.test(code);
  if (isBookmarklet) {
    code = code
      .replace(/^javascript:/, '')
      .split(/%(?![a-f\d]{2})/i)
      .map(decodeURIComponent)
      .join('%');
  }

  let ast: ParseResult<t.File> = null!;
  let outputCode = '';
  let bundle: Bundle | undefined;
  const plugins = loadPlugins(options.plugins);

  const stages = [
    () => {
      ast = parse(code, {
        sourceType: 'unambiguous',
        allowReturnOutsideFunction: true,
        plugins: ['jsx'],
      });
    },
    plugins.parse && (() => plugins.parse!(ast)),

    () => {
      applyTransforms(
        ast,
        [blockStatements, sequence, splitVariableDeclarations, varFunctions],
        { name: 'prepare' },
      );
    },
    plugins.prepare && (() => plugins.prepare!(ast)),

    options.deobfuscate &&
      (() => applyTransformAsync(ast, deobfuscate, options.sandbox)),
    plugins.deobfuscate && (() => plugins.deobfuscate!(ast)),

    options.unminify &&
      (() => {
        applyTransforms(ast, [transpile, unminify]);
      }),
    plugins.unminify && (() => plugins.unminify!(ast)),

    options.mangle && (() => applyTransform(ast, mangle)),
    // TODO: Also merge unminify visitor (breaks selfDefending/debugProtection atm)
    (options.deobfuscate || options.jsx) &&
      (() => {
        applyTransforms(
          ast,
          [
            // Have to run this after unminify to properly detect it
            options.deobfuscate ? [selfDefending, debugProtection] : [],
            options.jsx ? [jsx, jsxNew] : [],
          ].flat(),
        );
      }),
    options.deobfuscate && (() => applyTransform(ast, mergeObjectAssignments)),
    () => (outputCode = generate(ast)),
    // Unpacking modifies the same AST and may result in imports not at top level
    // so the code has to be generated before
    options.unpack && (() => (bundle = unpackAST(ast, options.mappings(m)))),
    plugins.unpack && (() => plugins.unpack!(ast)),
  ].filter(Boolean) as (() => unknown)[];

  for (let i = 0; i < stages.length; i++) {
    await stages[i]();
    options.onProgress((100 / stages.length) * (i + 1));
  }

  return {
    code: outputCode,
    bundle,
    async save(path) {
      const { mkdir, writeFile } = await import('node:fs/promises');
      path = normalize(path);
      await mkdir(path, { recursive: true });
      await writeFile(join(path, 'deobfuscated.js'), outputCode, 'utf8');
      await bundle?.save(path);
    },
  };
}
