import * as t from '@babel/types';

export interface Module {
  id: number;
  ast: t.File;
  isEntry: boolean;
}
