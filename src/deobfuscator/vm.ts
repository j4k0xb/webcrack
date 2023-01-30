import generate from '@babel/generator';
import { VM, VMScript } from 'vm2';
import { ArrayRotator } from './arrayRotator';
import { Decoder } from './decoder';
import { StringArray } from './stringArray';

export function createVM(options: {
  stringArray: StringArray;
  rotator?: ArrayRotator;
  decoder: Decoder;
}) {
  const util = { params: [] as unknown[], stringArray: [] as string[] };
  const vm = new VM({
    timeout: 5_000,
    allowAsync: false,
    eval: false,
    wasm: false,
    sandbox: { debugger: {}, util },
  });
  vm.freeze(util, 'util');

  const stringArrayCode = generate(options.stringArray.path.node).code;
  const rotatorCode = options.rotator
    ? generate(options.rotator.path.node).code
    : '';
  const decoderCode = generate(options.decoder.path.node).code;

  // Precompute the rotated string array to allow for faster decoding
  util.stringArray = vm.run(`
    ${stringArrayCode}
    ${rotatorCode}
    ${decoderCode}
    ${options.stringArray.name}();`);

  const script = new VMScript(`
    function ${options.stringArray.name}() { return util.stringArray; }
    ${decoderCode}
    ${options.decoder.name}(...util.params);`);
  return {
    decode(params: unknown[]) {
      util.params = params;
      return vm.run(script);
    },
  };
}
