import type { NodePath } from '@babel/traverse';
import type { CallExpression } from '@babel/types';
import debug from 'debug';
import type ivm6 from 'isolated-vm-6';
import type ivm7 from 'isolated-vm-7';
import { generate } from '../ast-utils';
import type { ArrayRotator } from './array-rotator';
import type { Decoder } from './decoder';
import type { StringArray } from './string-array';

export type Sandbox = (code: string) => Promise<unknown>;

async function importIsolatedVM(): Promise<typeof ivm6 | typeof ivm7> {
  const major = Number(globalThis.process.versions.node.split('.')[0]);
  const ivm = await (major >= 26
    ? import('isolated-vm-7')
    : import('isolated-vm-6'));
  return ivm.default;
}

export function createNodeSandbox(): Sandbox {
  return async (code: string) => {
    const { Isolate } = await importIsolatedVM();
    const isolate = new Isolate();
    const context = await isolate.createContext();
    const result = (await context.eval(code, {
      timeout: 10_000,
      copy: true,
      filename: 'file:///obfuscated.js',
    })) as unknown;
    context.release();
    isolate.dispose();
    return result;
  };
}

export function createBrowserSandbox(): Sandbox {
  return () => {
    // TODO: use sandybox (not available in web workers though)
    throw new Error('Custom Sandbox implementation required.');
  };
}

export class VMDecoder {
  decoders: Decoder[];
  private setupCode: string;
  private sandbox: Sandbox;

  constructor(
    sandbox: Sandbox,
    stringArray: StringArray,
    decoders: Decoder[],
    rotator?: ArrayRotator,
  ) {
    this.sandbox = sandbox;
    this.decoders = decoders;

    // Generate as compact to bypass the self defense
    // (which tests someFunction.toString against a regex)
    const generateOptions = {
      compact: true,
      shouldPrintComment: () => false,
    };
    const stringArrayCode = generate(stringArray.path.node, generateOptions);
    const decoderCode = decoders
      .map((decoder) => generate(decoder.path.node, generateOptions))
      .join(';\n');
    const rotatorCode = rotator ? generate(rotator.node, generateOptions) : '';

    this.setupCode = [stringArrayCode, decoderCode, rotatorCode].join(';\n');
  }

  async decode(calls: NodePath<CallExpression>[]): Promise<unknown[]> {
    const code = `(() => {
      ${this.setupCode}
      return [${calls.join(',')}]
    })()`;

    try {
      const result = await this.sandbox(code);
      return result as unknown[];
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ERR_MODULE_NOT_FOUND'
      ) {
        console.log({ ...error });
        debug('webcrack:deobfuscate')(error);
        return [];
      }
      if (
        error instanceof Error &&
        (error.message.includes('undefined symbol') ||
          error.message.includes('Segmentation fault') ||
          error.message.includes('No native build'))
      ) {
        debug('webcrack:deobfuscate')(
          'isolated-vm version mismatch. Check https://webcrack.netlify.app/docs/guide/common-errors.html#isolated-vm',
        );
        debug('webcrack:deobfuscate')(error);
        return [];
      }

      debug('webcrack:deobfuscate')('vm code:', code);
      throw error;
    }
  }
}
