import * as t from '@babel/types';
import { Module } from '../module';

export class BrowserifyModule extends Module {
  constructor(
    id: number,
    ast: t.File,
    isEntry: boolean,
    public dependencies: Record<number, string>
  ) {
    super(id, ast, isEntry);
  }
}
