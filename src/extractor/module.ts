import generate from '@babel/generator';
import * as t from '@babel/types';

export class Module {
  id: number;
  isEntry: boolean;
  path: string;
  /**
   * @internal
   */
  ast: t.File;
  #code: string | undefined;

  constructor(id: number, ast: t.File, isEntry: boolean) {
    this.id = id;
    this.ast = ast;
    this.isEntry = isEntry;
    this.path = `./${isEntry ? 'index' : id}.js`;
  }

  /**
   * @internal
   */
  regenerateCode(): string {
    this.#code = generate(this.ast).code;
    return this.#code;
  }

  get code(): string {
    return this.#code ?? this.regenerateCode();
  }

  set code(code: string) {
    this.#code = code;
  }
}
