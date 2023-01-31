import { Node, TraverseOptions } from '@babel/traverse';
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

export interface Transform<TOptions = any> {
  name: string;
  tags: Tag[];
  preTransforms?: Transform[];
  postTransforms?: Transform[];
  run?: (ast: Node, options: TOptions) => void;
  visitor?: (options?: TOptions) => TraverseOptions<{ changes: number }>;
}

export type Tag = 'safe' | 'unsafe' | 'formatting';
