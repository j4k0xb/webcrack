import generate from '@babel/generator';
import { VM, VMScript } from 'vm2';
import { ArrayRotator } from './arrayRotator';
import { Decoder } from './decoder';
import { StringArray } from './stringArray';

export class VMDecoder {
  private util = {
    params: [] as unknown[],
    decoder: '',
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

    // Precompute the rotated string array to allow for faster decoding
    // We need to include all decoders because the rotator might call them
    this.util.stringArray = this.vm.run(`
      ${stringArrayCode}
      ${rotatorCode}
      ${decoderCode}
      ${stringArray.name}();
    `);

    this.script = new VMScript(`
      function ${stringArray.name}() { return util.stringArray; }
      ${decoderCode}
      var __DECODERS__ = { ${decoders.map(d => d.name).join(', ')} };
      __DECODERS__[util.decoder](...util.params);
    `);
  }

  decode(decoder: Decoder, args: unknown[]) {
    this.util.decoder = decoder.name;
    this.util.params = args;
    return this.vm.run(this.script);
  }
}
