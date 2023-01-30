import * as t from '@babel/types';
import { codePreview } from '../utils/ast';
import { findArrayRotator } from './arrayRotator';
import { findDecoder } from './decoder';
import { findStringArray } from './stringArray';

// https://astexplorer.net/#/gist/b1018df4a8daebfcb1daf9d61fe17557/4ff9ad0e9c40b9616956f17f59a2d9888cd62a4f

export default (ast: t.Node) => {
  const stringArray = findStringArray(ast);
  console.log(`String Array: ${!!stringArray}`);
  if (!stringArray) return;
  console.log(` - ${codePreview(stringArray.path.node)}`);

  const rotator = findArrayRotator(ast);
  console.log(`String Array Rotate: ${!!rotator}`);
  if (rotator) {
    console.log(` - ${codePreview(rotator.path.node)}`);
  }

  const decoder = findDecoder(stringArray);
  console.log(`String Array Decode: ${!!decoder}`);
  if (!decoder) return;
  console.log(` - ${codePreview(decoder.path.node)}`);
  decoder.inlineAliasVars();
  console.log('Inlined decoder alias vars');
};
