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
  visitor: TraverseOptions<{ changes: number }>;
  tags?: Tag[];
}

export enum Tag {
  SAFE,
  UNSAFE,
  PREPROCESS,
}
