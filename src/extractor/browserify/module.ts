import * as t from '@babel/types';
import { Module } from '../module';

export class BrowserifyModule extends Module {
  dependencies: Record<number, string>;

  constructor(
    id: number,
    ast: t.File,
    isEntry: boolean,
    dependencies: Record<number, string>
  ) {
    super(id, ast, isEntry);
    this.dependencies = dependencies;
  }
}
