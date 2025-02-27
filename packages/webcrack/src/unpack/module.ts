import type * as t from '@babel/types';
import { generate } from '../ast-utils';

export class Module {
  id: string;
  isEntry: boolean;
  path: string;
  /**
   * @internal
   */
  ast: t.File;
  #code: string | undefined;

  constructor(id: string, ast: t.File, isEntry: boolean) {
    this.id = id;
    this.ast = ast;
    this.isEntry = isEntry;
    this.path = `./${isEntry ? 'index' : id.replace(/\.js$/, '')}.js`;
  }

  /**
   * @internal
   */
  regenerateCode(): string {
    this.#code = generate(this.ast);
    return this.#code;
  }

  get code(): string {
    return this.#code ?? this.regenerateCode();
  }

  set code(code: string) {
    this.#code = code;
  }
}
