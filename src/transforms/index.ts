import { Node, TraverseOptions } from '@babel/traverse';
import blockStatement from './blockStatement';
import computedProperties from './computedProperties';
import extractTernaryCalls from './extractTernaryCalls';
import numberExpressions from './numberExpressions';
import rawLiterals from './rawLiterals';
import sequence from './sequence';
import splitVariableDeclarations from './splitVariableDeclarations';

export const transforms: Transform<any>[] = [
  rawLiterals,
  blockStatement,
  computedProperties,
  sequence,
  splitVariableDeclarations,
  extractTernaryCalls,
  numberExpressions,
];

export interface Transform<TOptions = any> {
  name: string;
  tags: Tag[];
  preTransforms?: Transform[];
  postTransforms?: Transform[];
  run?: (ast: Node, state: { changes: number }, options?: TOptions) => void;
  visitor?: (options?: TOptions) => TraverseOptions<{ changes: number }>;
}

export type Tag = 'safe' | 'unsafe' | 'formatting';
