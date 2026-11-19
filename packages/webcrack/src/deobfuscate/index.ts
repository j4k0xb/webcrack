import debug from 'debug';
import type { AsyncTransform, TransformState } from '../ast-utils';
import {
  applyTransform,
  applyTransformAsync,
  applyTransforms,
} from '../ast-utils';
import mergeStrings from '../unminify/transforms/merge-strings';
import { findArrayRotator } from './array-rotator';
import controlFlowObject from './control-flow-object';
import controlFlowSwitch from './control-flow-switch';
import deadCode from './dead-code';
import { findDecoders } from './decoder';
import inlineDecodedStrings from './inline-decoded-strings';
import inlineDecoderWrappers from './inline-decoder-wrappers';
import inlineObjectProps from './inline-object-props';
import { findStringArray } from './string-array';
import type { Sandbox } from './vm';
import { VMDecoder, createBrowserSandbox, createNodeSandbox } from './vm';
import type { Node } from '@babel/types';

export { createBrowserSandbox, createNodeSandbox, type Sandbox };

// https://astexplorer.net/#/gist/b1018df4a8daebfcb1daf9d61fe17557/4ff9ad0e9c40b9616956f17f59a2d9888cd62a4f

async function deobfuscateAllStringArrays(
  ast: Node,
  state: TransformState,
  sandbox: Sandbox | undefined,
  logger: debug.Debugger,
) {
  if (!sandbox) return;

  logger("deobf'ing string arrays...");

  let stringArraysFound = 0;

  let possibleStringArray = findStringArray(ast);

  while (possibleStringArray) {
    logger(
      'string array found: %s, length %d',
      possibleStringArray.originalName,
      possibleStringArray.length,
    );

    stringArraysFound++;
    const rotator = findArrayRotator(possibleStringArray);
    logger(`String Array Rotate: ${rotator ? 'yes' : 'no'}`);

    const decoders = findDecoders(possibleStringArray);
    logger(
      `String Array Decoders: ${decoders
        .map((d) => d.originalName)
        .join(', ')}`,
    );

    state.changes += applyTransform(ast, inlineObjectProps).changes;

    for (const decoder of decoders) {
      state.changes += applyTransform(
        ast,
        inlineDecoderWrappers,
        decoder,
      ).changes;
    }

    const vm = new VMDecoder(sandbox, possibleStringArray, decoders, rotator);
    state.changes += (
      await applyTransformAsync(ast, inlineDecodedStrings, { vm })
    ).changes;

    if (decoders.length > 0) {
      possibleStringArray.path.remove();
      rotator?.remove();
      decoders.forEach((decoder) => decoder.path.remove());
      state.changes += 2 + decoders.length;
    }

    possibleStringArray = findStringArray(ast);
  }

  logger(stringArraysFound > 0 ? `${stringArraysFound} string arrays were deobfuscated` : 'no string arrays found');
}

export default {
  name: 'deobfuscate',
  tags: ['unsafe'],
  scope: true,
  async run(ast, state, sandbox) {
    if (!sandbox) return;

    const logger = debug('webcrack:deobfuscate');

    await deobfuscateAllStringArrays(ast, state, sandbox, logger);

    state.changes += applyTransforms(
      ast,
      [mergeStrings, deadCode, controlFlowObject, controlFlowSwitch],
      { noScope: true },
    ).changes;
  },
} satisfies AsyncTransform<Sandbox>;
