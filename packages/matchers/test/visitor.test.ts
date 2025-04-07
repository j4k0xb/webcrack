import traverse, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { expect, test, vi } from 'vitest';
import * as m from '../src';

test('visitor', () => {
  const ast = t.program([t.emptyStatement(), t.returnStatement()]);
  const cb = vi.fn((path: NodePath<t.ReturnStatement>, captures: object) => {
    expect(path.type).toBe('ReturnStatement');
    expect(captures).toEqual({});
  });
  const visitor = m.compileVisitor(m.returnStatement(), cb);
  traverse(ast, visitor);

  expect(cb).toHaveBeenCalledOnce();
});
