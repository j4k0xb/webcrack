import { TraverseOptions } from '@babel/traverse';
import computedProperties from './computedProperties';
import sequence from './sequence';
import splitVariableDeclarations from './splitVariableDeclarations';

export const transforms: Transform[] = [
  computedProperties,
  sequence,
  splitVariableDeclarations,
];

export interface Transform {
  name: string;
  tags: Tag[];
  visitor: TraverseOptions<{ changes: number }>;
}

export type Tag = 'safe' | 'unsafe' | 'preprocess';
