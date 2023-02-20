import generate from '@babel/generator';
import * as t from '@babel/types';

export class Module {
  path: string;

  constructor(public id: number, public ast: t.File, public isEntry: boolean) {
    this.path = `./${isEntry ? 'index' : id}.js`;
  }

  get code() {
    return generate(this.ast).code;
  }
}
