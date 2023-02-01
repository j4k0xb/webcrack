import { applyTransform, Transform } from '../transforms';
import blockStatement from '../transforms/blockStatement';
import computedProperties from '../transforms/computedProperties';
import extractTernaryCalls from '../transforms/extractTernaryCalls';
import sequence from '../transforms/sequence';
import splitVariableDeclarations from '../transforms/splitVariableDeclarations';
import unminifyBooleans from '../transforms/unminifyBooleans';
import { codePreview } from '../utils/ast';
import { findArrayRotator } from './arrayRotator';
import { findDecoders } from './decoder';
import inlineDecodedStrings from './inlineDecodedStrings';
import inlineDecoderWrappers from './inlineDecoderWrappers';
import { findStringArray } from './stringArray';
import { createVM } from './vm';

// https://astexplorer.net/#/gist/b1018df4a8daebfcb1daf9d61fe17557/4ff9ad0e9c40b9616956f17f59a2d9888cd62a4f

export default {
  name: 'deobfuscate',
  tags: ['unsafe'],
  preTransforms: [
    blockStatement,
    computedProperties,
    sequence,
    splitVariableDeclarations,
    unminifyBooleans,
  ],
  run(ast, state) {
    const stringArray = findStringArray(ast);
    console.log(`String Array: ${!!stringArray}`);
    if (!stringArray) return;
    console.log(' - length: ' + stringArray.strings.length);
    console.log(` - ${codePreview(stringArray.path.node)}`);

    const rotator = findArrayRotator(ast);
    console.log(`String Array Rotate: ${!!rotator}`);
    if (rotator) {
      console.log(` - ${codePreview(rotator.path.node)}`);
    }

    const decoders = findDecoders(stringArray);
    console.log(`String Array Encodings: ${decoders.length}`);

    for (const decoder of decoders) {
      console.log(` - ${codePreview(decoder.path.node)}`);

      applyTransform(ast, inlineDecoderWrappers, decoder.path);

      // Needed so the decoder calls only contain literal arguments
      applyTransform(ast, extractTernaryCalls, { callee: decoder.name });
    }

    const vm = createVM({ stringArray, rotator, decoders });
    applyTransform(ast, inlineDecodedStrings, { decoders, vm });

    stringArray.path.remove();
    decoders.forEach(decoder => decoder.path.remove());
    rotator?.path.remove();
  },
} satisfies Transform;
