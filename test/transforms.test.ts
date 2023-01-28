import * as t from '@babel/types';
import { describe, expect, it } from 'vitest';
import sequence from '../src/transforms/sequence';
import { expectTransform } from './utils';

declare global {
  namespace Vi {
    interface MatcherState {
      transform: (ast: t.Node) => void;
    }
  }
}

describe('sequence', () => {
  expect.setState({ transform: sequence });
  it('to statements', () =>
    expectTransform(`
      if (a) b(), c();
    `).toMatchInlineSnapshot(`
      "if (a) {
        b();
        c();
      }"
    `));

  it('rearrange from return', () =>
    expectTransform(`
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
    expectTransform(`
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
    expectTransform(`
      for (let key in a = 1, object) {}
    `).toMatchInlineSnapshot(`
      "a = 1;
      for (let key in object) {}"
    `));
});
