import generate from '@babel/generator';
import { NodePath } from '@babel/traverse';
import { CallExpression } from '@babel/types';
import { ArrayRotator } from './arrayRotator';
import { Decoder } from './decoder';
import { StringArray } from './stringArray';

export type Sandbox = (code: string) => Promise<unknown>;

export async function createNodeSandbox() {
  const {
    default: { Isolate },
  } = await import('isolated-vm');
  return async (code: string) => {
    const isolate = new Isolate();
    const context = await isolate.createContext();
    return await context.eval(code, {
      timeout: 10_000,
      copy: true,
      filename: 'file:///obfuscated.js',
    });
  };
}

export class VMDecoder {
  private setupCode: string;

  constructor(
    public sandbox: Sandbox,
    public stringArray: StringArray,
    public decoders: Decoder[],
    public rotator?: ArrayRotator
  ) {
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

  async decode(calls: NodePath<CallExpression>[]): Promise<string[]> {
    return (await this.sandbox(
      `(() => {
        ${this.setupCode}
        return [${calls.join(',')}]
      })()`
    )) as string[];
  }
}
