import generate from '@babel/generator';
import { VM, VMScript } from 'vm2';
import { ArrayRotator } from './arrayRotator';
import { Decoder } from './decoder';
import { StringArray } from './stringArray';

export function createVM(options: {
  stringArray: StringArray;
  rotator?: ArrayRotator;
  decoders: Decoder[];
}) {
  const util = {
    params: [] as unknown[],
    decoder: '',
    stringArray: [] as string[],
  };
  const vm = new VM({
    timeout: 5_000,
    allowAsync: false,
    eval: false,
    wasm: false,
    sandbox: { debugger: {}, util },
  });
  vm.freeze(util, 'util');

  // Generate as compact to bypass the debug protection
  // (which tests someFunction.toString against a regex)
  const stringArrayCode = generate(options.stringArray.path.node, {
    compact: true,
  }).code;
  const rotatorCode = options.rotator
    ? generate(options.rotator.path.node, { compact: true }).code
    : '';
  const decoderCode = options.decoders
    .map(decoder => generate(decoder.path.node, { compact: true }).code)
    .join('\n');

  // Precompute the rotated string array to allow for faster decoding
  // We need to include all decoders because the rotator might call them
  util.stringArray = vm.run(`
    ${stringArrayCode}
    ${rotatorCode}
    ${decoderCode}
    ${options.stringArray.name}();`);

  const script = new VMScript(`
    function ${options.stringArray.name}() { return util.stringArray; }
    ${decoderCode}
    var __DECODERS__ = { ${options.decoders.map(d => d.name).join(', ')} };
    __DECODERS__[util.decoder](...util.params);`);

  return {
    decode(decoder: Decoder, params: unknown[]) {
      util.decoder = decoder.name;
      util.params = params;
      return vm.run(script);
    },
  };
}
