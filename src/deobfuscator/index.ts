import debug from 'debug';
import {
  applyTransform,
  applyTransformAsync,
  AsyncTransform,
} from '../transforms';
import mergeStrings from '../transforms/mergeStrings';
import { codePreview } from '../utils/ast';
import { findArrayRotator } from './arrayRotator';
import controlFlowObject from './controlFlowObject';
import controlFlowSwitch from './controlFlowSwitch';
import { findDecoders } from './decoder';
import inlineDecodedStrings from './inlineDecodedStrings';
import inlineDecoderWrappers from './inlineDecoderWrappers';
import objectLiterals from './objectLiterals';
import { findStringArray } from './stringArray';
import { createNodeSandbox, Sandbox, VMDecoder } from './vm';

// https://astexplorer.net/#/gist/b1018df4a8daebfcb1daf9d61fe17557/4ff9ad0e9c40b9616956f17f59a2d9888cd62a4f

export default {
  name: 'deobfuscate',
  tags: ['unsafe'],
  async run(ast, state, options) {
    const logger = debug('webcrack:deobfuscate');
    if (!process.env.browser && !options) {
      options = { sandbox: createNodeSandbox() };
    }
    if (!options) return;

    const stringArray = findStringArray(ast);
    logger(`String Array: ${stringArray ? 'yes' : 'no'}`);
    if (!stringArray) return;
    logger(` - length: ${stringArray.length}`);
    logger(` - ${codePreview(stringArray.path.node)}`);

    const rotator = findArrayRotator(stringArray);
    logger(`String Array Rotate: ${rotator ? 'yes' : 'no'}`);
    if (rotator) {
      logger(` - ${codePreview(rotator.node)}`);
    }

    const decoders = findDecoders(stringArray);
    logger(`String Array Encodings: ${decoders.length}`);

    state.changes += applyTransform(ast, objectLiterals).changes;

    for (const decoder of decoders) {
      logger(` - ${codePreview(decoder.path.node)}`);

      state.changes += applyTransform(
        ast,
        inlineDecoderWrappers,
        decoder.path
      ).changes;
    }

    const vm = new VMDecoder(options.sandbox, stringArray, decoders, rotator);
    state.changes += (
      await applyTransformAsync(ast, inlineDecodedStrings, { vm })
    ).changes;

    stringArray.path.remove();
    rotator?.remove();
    decoders.forEach(decoder => decoder.path.remove());
    state.changes += 2 + decoders.length;

    state.changes += applyTransform(ast, mergeStrings).changes;
    state.changes += applyTransform(ast, controlFlowObject).changes;
    state.changes += applyTransform(ast, controlFlowSwitch).changes;
  },
} satisfies AsyncTransform<{ sandbox: Sandbox }>;
