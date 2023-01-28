import * as t from '@babel/types';
import { describe, it } from 'vitest';
import computedProperties from '../src/transforms/computedProperties';
import sequence from '../src/transforms/sequence';
import splitVariableDeclarations from '../src/transforms/splitVariableDeclarations';
import { transformer } from './utils';

declare global {
  namespace Vi {
    interface MatcherState {
      transform: (ast: t.Node) => void;
    }
  }
}

describe('sequence', () => {
  const expect = transformer(sequence);
  it('to statements', () =>
    expect(`
      if (a) b(), c();
    `).toMatchInlineSnapshot(`
      "if (a) {
        b();
        c();
      }"
    `));

  it('rearrange from return', () =>
    expect(`
      function f() {
        return a(), b(), c();
      }
    `).toMatchInlineSnapshot(`
      "function f() {
        a();
        b();
        return c();
      }"
    `));

  it('rearrange from if', () =>
    expect(`
      function f() {
        if (a(), b()) c();
      }
    `).toMatchInlineSnapshot(`
      "function f() {
        a();
        if (b()) c();
      }"
    `));

  it('rearrange from for-in', () =>
    expect(`
      for (let key in a = 1, object) {}
    `).toMatchInlineSnapshot(`
      "a = 1;
      for (let key in object) {}"
    `));
});

describe('splitVariableDeclarations', () => {
  const expect = transformer(splitVariableDeclarations);
  it('split variable declaration', () =>
    expect(`
      const a = 1, b = 2, c = 3;
    `).toMatchInlineSnapshot(`
      "const a = 1;
      const b = 2;
      const c = 3;"
    `));
});

describe('computedProperties', () => {
  const expect = transformer(computedProperties);
  it('convert to identifier', () =>
    expect(`
      console['log']('hello');
    `).toMatchInlineSnapshot('"console.log(\'hello\');"'));

  it('ignore invalid identifier', () =>
    expect(`
      console["1"]('hello');
    `).toMatchInlineSnapshot('"console[\\"1\\"](\'hello\');"'));
});
