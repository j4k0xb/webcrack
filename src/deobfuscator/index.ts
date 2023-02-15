import { applyTransform, Transform } from '../transforms';
import blockStatement from '../transforms/blockStatement';
import extractTernaryCalls from '../transforms/extractTernaryCalls';
import sequence from '../transforms/sequence';
import splitVariableDeclarations from '../transforms/splitVariableDeclarations';
import { codePreview } from '../utils/ast';
import { findArrayRotator } from './arrayRotator';
import controlFlowObject from './controlFlowObject';
import { findDecoders } from './decoder';
import inlineDecodedStrings from './inlineDecodedStrings';
import inlineDecoderWrappers from './inlineDecoderWrappers';
import { findStringArray } from './stringArray';
import { VMDecoder } from './vm';

// https://astexplorer.net/#/gist/b1018df4a8daebfcb1daf9d61fe17557/4ff9ad0e9c40b9616956f17f59a2d9888cd62a4f

export default {
  name: 'deobfuscate',
  tags: ['unsafe'],
  preTransforms: [blockStatement, sequence, splitVariableDeclarations],
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

      state.changes += applyTransform(
        ast,
        inlineDecoderWrappers,
        decoder.path
      ).changes;

      // Needed so the decoder calls only contain literal arguments
      state.changes += applyTransform(ast, extractTernaryCalls, {
        callee: decoder.name,
      }).changes;
    }

    const vm = new VMDecoder(stringArray, decoders, rotator);
    state.changes += applyTransform(ast, inlineDecodedStrings, { vm }).changes;

    stringArray.path.remove();
    rotator?.path.remove();
    decoders.forEach(decoder => decoder.path.remove());
    state.changes += 2 + decoders.length;

    state.changes += applyTransform(ast, controlFlowObject).changes;
  },
} satisfies Transform;
