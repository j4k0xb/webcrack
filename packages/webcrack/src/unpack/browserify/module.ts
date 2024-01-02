import type * as t from '@babel/types';
import { Module } from '../module';

export class BrowserifyModule extends Module {
  dependencies: Record<number, string>;

  constructor(
    id: string,
    ast: t.File,
    isEntry: boolean,
    dependencies: Record<number, string>,
  ) {
    super(id, ast, isEntry);
    this.dependencies = dependencies;
  }
}
