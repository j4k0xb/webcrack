import { visitors } from '@babel/traverse';
import { Transform } from '.';
import blockStatement from './blockStatement';
import booleanIf from './booleanIf';
import computedProperties from './computedProperties';
import deterministicIf from './deterministicIf';
import mergeElseIf from './mergeElseIf';
import mergeStrings from './mergeStrings';
import numberExpressions from './numberExpressions';
import rawLiterals from './rawLiterals';
import sequence from './sequence';
import splitVariableDeclarations from './splitVariableDeclarations';
import ternaryToIf from './ternaryToIf';
import unminifyBooleans from './unminifyBooleans';
import void0ToUndefined from './void0ToUndefined';
import yoda from './yoda';

export default {
  name: 'unminify',
  tags: ['safe'],
  visitor() {
    const traverseOptions = [
      rawLiterals.visitor(),
      blockStatement.visitor(),
      mergeStrings.visitor(),
      computedProperties.visitor(),
      splitVariableDeclarations.visitor(),
      sequence.visitor(),
      numberExpressions.visitor(),
      unminifyBooleans.visitor(),
      booleanIf.visitor(),
      ternaryToIf.visitor(),
      deterministicIf.visitor(),
      mergeElseIf.visitor(),
      void0ToUndefined.visitor(),
      yoda.visitor(),
    ];
    const visitor = visitors.merge(traverseOptions);
    // https://github.com/babel/babel/issues/15587
    // @ts-expect-error bug in the babel types, array of functions works
    visitor.enter = traverseOptions.flatMap(({ enter }) => enter ?? []);
    // @ts-expect-error bug in the babel types, array of functions works
    visitor.exit = traverseOptions.flatMap(({ exit }) => exit ?? []);
    return visitor;
  },
} satisfies Transform;
