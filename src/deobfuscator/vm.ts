import generate from '@babel/generator';
import { VM, VMScript } from 'vm2';
import { ArrayRotator } from './arrayRotator';
import { Decoder } from './decoder';
import { StringArray } from './stringArray';

export class VMDecoder {
  private util = {
    calls: [] as { decoder: string; args: unknown[] }[],
    stringArray: [] as string[],
  };

  private vm = new VM({
    timeout: 5_000,
    allowAsync: false,
    eval: false,
    wasm: false,
    sandbox: { debugger: {}, util: this.util },
  });

  private script: VMScript;

  constructor(
    public stringArray: StringArray,
    public decoders: Decoder[],
    public rotator?: ArrayRotator
  ) {
    this.vm.freeze(this.util, 'util');

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

    this.script = new VMScript(`
      ${stringArrayCode}
      ${rotatorCode}
      ${decoderCode}
      const __DECODERS__ = { ${decoders.map(d => d.name).join(', ')} };
      util.calls.map(({ decoder, args }) => __DECODERS__[decoder](...args));
    `);
  }

  decode(calls: { decoder: string; args: unknown[] }[]): string[] {
    this.util.calls = calls;
    return this.vm.run(this.script);
  }
}
