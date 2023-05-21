import generate from '@babel/generator';
import * as t from '@babel/types';

export class Module {
  id: number;
  ast: t.File;
  isEntry: boolean;
  path: string;

  constructor(id: number, ast: t.File, isEntry: boolean) {
    this.id = id;
    this.ast = ast;
    this.isEntry = isEntry;
    this.path = `./${isEntry ? 'index' : id}.js`;
  }

  get code(): string {
    return generate(this.ast).code;
  }
}
