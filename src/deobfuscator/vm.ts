import generate from '@babel/generator';
import { NodePath } from '@babel/traverse';
import { CallExpression } from '@babel/types';
import debug from 'debug';
import { ArrayRotator } from './arrayRotator';
import { Decoder } from './decoder';
import { StringArray } from './stringArray';

export type Sandbox = (code: string) => Promise<unknown>;

export function createNodeSandbox(): Sandbox {
  return async (code: string) => {
    const {
      default: { Isolate },
    } = await import('isolated-vm');
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
    rotator?: ArrayRotator
  ) {
    this.sandbox = sandbox;
    this.decoders = decoders;

    // Generate as compact to bypass the self defense
    // (which tests someFunction.toString against a regex)
    const generateOptions = {
      compact: true,
      shouldPrintComment: () => false,
    };
    const stringArrayCode = generate(
      stringArray.path.node,
      generateOptions
    ).code;
    const rotatorCode = rotator
      ? generate(rotator.node, generateOptions).code
      : '';
    const decoderCode = decoders
      .map(decoder => generate(decoder.path.node, generateOptions).code)
      .join(';\n');

    this.setupCode = [stringArrayCode, rotatorCode, decoderCode].join(';\n');
  }

  async decode(calls: NodePath<CallExpression>[]): Promise<unknown[]> {
    const code = `(() => {
      ${this.setupCode}
      return [${calls.join(',')}]
    })()`;

    try {
      const result = await this.sandbox(code);
      return result as unknown[];
    } catch (err) {
      debug('webcrack:deobfuscate')('vm code:', code);
      throw err;
    }
  }
}
