import type * as t from '@babel/types';
import { posix } from 'node:path';
import { generate } from '../ast-utils';

// eslint-disable-next-line @typescript-eslint/unbound-method
const { normalize, extname } = posix;

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
    this.path =
      extname(id) === '' && isEntry ? 'index.js' : this.normalizePath(id);
  }

  private normalizePath(path: string): string {
    return normalize(extname(path) === '' ? `${path}.js` : path);
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
