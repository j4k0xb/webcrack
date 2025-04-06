import * as m from '@codemod/matchers';
import * as t from '@babel/types';
import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import { expect, test } from 'vitest';
import {
  anySubList,
  isBindingPossiblyUsedBefore,
  isConstantBinding,
} from '../matcher.js';

test('any sub list', () => {
  const a = m.capture(m.matcher((x) => x === 2));
  const b = m.capture(m.matcher((x) => x === 4));

  expect(anySubList(a, b).match([1, 2, 3, 4, 5])).toBe(true);
  expect(a.currentKeys).toEqual([1]);
  expect(b.currentKeys).toEqual([3]);
});

test('isConstantBinding', () => {
  const ast = parse('const a = 1; let b = 2, c = 3; c = 4');
  traverse(ast, {
    Program(path) {
      const a = path.scope.getBinding('a')!;
      expect(isConstantBinding(a)).toBe(true);

      const b = path.scope.getBinding('b')!;
      expect(isConstantBinding(b)).toBe(true);

      const c = path.scope.getBinding('c')!;
      expect(isConstantBinding(c)).toBe(false);
    },
  });
});

test('isConstantBinding - function', () => {
  const ast = parse('function a(b, c) { b = 10; console.log(c); c = 20 }');
  traverse(ast, {
    Program(path) {
      const func = path.get('body.0') as NodePath<t.FunctionDeclaration>;

      const b = func.scope.getBinding('b')!;
      expect(isConstantBinding(b)).toBe(true);

      const c = func.scope.getBinding('c')!;
      expect(isConstantBinding(c)).toBe(false);
    },
  });
});

test('isBindingPossiblyUsedBefore', () => {
  const ast = parse('var a = 1; console.log(a); a = 2;');
  traverse(ast, {
    Program(path) {
      const a = path.scope.getBinding('a')!;
      const assign = a.constantViolations[0];
      expect(isBindingPossiblyUsedBefore(a, assign)).toBe(true);
    },
  });
});
