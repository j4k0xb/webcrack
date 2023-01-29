import * as t from '@babel/types';
import { findArrayRotator } from './arrayRotator';
import { findDecoder } from './decoder';
import findStringArray from './stringArray';

// https://astexplorer.net/#/gist/b1018df4a8daebfcb1daf9d61fe17557/4ff9ad0e9c40b9616956f17f59a2d9888cd62a4f

export default (ast: t.Node) => {
  const stringArray = findStringArray(ast);
  if (!stringArray) return;
  console.log(
    `String array of length ${stringArray.strings.length} found: ${stringArray.name}`
  );

  const rotator = findArrayRotator(ast);
  if (rotator) {
    console.log('Rotator found');
  }

  const decoder = findDecoder(stringArray);
  if (!decoder) return;
  console.log(`Decoder found: ${decoder.name}`);
  decoder.inlineAliasVars();
  console.log('Inlined decoder alias vars');
};
