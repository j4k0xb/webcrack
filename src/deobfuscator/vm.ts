import generate from '@babel/generator';
import { NodePath } from '@babel/traverse';
import { CallExpression } from '@babel/types';
import { ArrayRotator } from './arrayRotator';
import { Decoder } from './decoder';
import { StringArray } from './stringArray';

export type Sandbox = (code: string) => Promise<unknown>;

export function createNodeSandbox(): Sandbox {
  return async (code: string) => {
    const { VM } = await import('vm2');
    const vm = new VM({
      timeout: 30_000,
      allowAsync: false,
      eval: false,
      wasm: false,
    });
    return vm.run(code) as unknown;
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
    const stringArrayCode = generate(stringArray.path.node, {
      compact: true,
    }).code;
    const rotatorCode = rotator
      ? generate(rotator.node, { compact: true }).code
      : '';
    const decoderCode = decoders
      .map(decoder => generate(decoder.path.node, { compact: true }).code)
      .join('\n');

    this.setupCode = stringArrayCode + rotatorCode + decoderCode;
  }

  async decode(calls: NodePath<CallExpression>[]): Promise<unknown[]> {
    const result = await this.sandbox(
      `(() => {
        ${this.setupCode}
        return [${calls.join(',')}]
      })()`
    );
    return result as unknown[];
  }
}
