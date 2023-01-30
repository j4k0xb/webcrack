import { TraverseOptions } from '@babel/traverse';
import blockStatement from './blockStatement';
import computedProperties from './computedProperties';
import extractTernaryCalls from './extractTernaryCalls';
import literals from './literals';
import sequence from './sequence';
import splitVariableDeclarations from './splitVariableDeclarations';

export const transforms: Transform<any>[] = [
  literals,
  blockStatement,
  computedProperties,
  sequence,
  splitVariableDeclarations,
  extractTernaryCalls,
];

export interface Transform<TFilter extends Record<string, unknown> = {}> {
  name: string;
  tags: Tag[];
  visitor: (
    filter?: (options: TFilter) => unknown
  ) => TraverseOptions<{ changes: number }>;
}

export type Tag = 'safe' | 'unsafe' | 'preprocess';
