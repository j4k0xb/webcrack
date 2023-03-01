import generate from '@babel/generator';
import { NodePath } from '@babel/traverse';
import { CallExpression } from '@babel/types';
import { VM } from 'vm2';
import { ArrayRotator } from './arrayRotator';
import { Decoder } from './decoder';
import { StringArray } from './stringArray';

const vm = new VM({
  timeout: 10_000,
  allowAsync: false,
  eval: false,
  wasm: false,
  sandbox: { debugger: {} },
});

export class VMDecoder {
  private setupCode: string;

  constructor(
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
      ? generate(rotator.path.node, { compact: true }).code
      : '';
    const decoderCode = decoders
      .map(decoder => generate(decoder.path.node, { compact: true }).code)
      .join('\n');

    this.setupCode = stringArrayCode + rotatorCode + decoderCode;
  }

  decode(calls: NodePath<CallExpression>[]): string[] {
    return vm.run(`
      ${this.setupCode}
      [${calls.join(',')}]
    `);
  }
}
