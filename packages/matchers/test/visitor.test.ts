import traverse, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { expect, test, vi } from 'vitest';
import * as m from '../src';

test('visitor', () => {
  const ast = t.program([t.emptyStatement(), t.returnStatement()]);
  const cb = vi.fn(function (
    this: undefined,
    path: NodePath<t.ReturnStatement>,
    state: unknown,
    captures: object,
  ) {
    expect(path.type).toBe('ReturnStatement');
    expect(this).toBe(state);
    expect(this).toBeUndefined();
    expect(captures).toEqual({});
  });
  const visitor = m.compileVisitor(m.returnStatement());
  traverse(ast, visitor(cb));

  expect(cb).toHaveBeenCalledOnce();
});
