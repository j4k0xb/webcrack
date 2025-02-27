import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { expect, test } from 'vitest';
import {
  inlineArrayElements,
  inlineFunctionCall,
  inlineObjectProperties,
  inlineVariable,
} from '..';

test('inline variable', () => {
  const ast = parse('let a = 1; let b = a;');
  traverse(ast, {
    Program(path) {
      const binding = path.scope.getBinding('a')!;
      inlineVariable(binding);
    },
  });
  expect(ast).toMatchInlineSnapshot(`let b = 1;`);
});

test('inline variable with assignment', () => {
  const ast = parse('let a; a = 1; let b = a;');
  traverse(ast, {
    Program(path) {
      const binding = path.scope.getBinding('a')!;
      inlineVariable(binding, undefined, true);
    },
  });
  expect(ast).toMatchInlineSnapshot(`let b = 1;`);
});

test('inline variable with multiple assignments', () => {
  const ast = parse('let a; a = 1; let b = a; a = 2; let c = a; a = 3;');
  traverse(ast, {
    Program(path) {
      const binding = path.scope.getBinding('a')!;
      inlineVariable(binding, undefined, true);
    },
  });
  expect(ast).toMatchInlineSnapshot(`
    let b = 1;
    let c = 2;
  `);
});

test('inline variable with assignment in an expression', () => {
  const ast = parse('let a; x = a = 1; let b = a;');
  traverse(ast, {
    Program(path) {
      const binding = path.scope.getBinding('a')!;
      inlineVariable(binding, undefined, true);
    },
  });
  expect(ast).toMatchInlineSnapshot(`
    x = 1;
    let b = 1;
  `);
});

test('inline array elements', () => {
  const ast = parse('const arr = ["foo", "bar"]; console.log(arr[0]);');
  traverse(ast, {
    ArrayExpression(path) {
      const binding = path.scope.getBinding('arr')!;
      inlineArrayElements(path.node, binding.referencePaths);
    },
  });
  expect(ast).toMatchInlineSnapshot(`
    const arr = ["foo", "bar"];
    console.log("foo");
  `);
});

test('inline object properties', () => {
  const ast = parse(`
    const obj = { c: 0x2f2, d: '0x396' };
    console.log(obj.c, obj.d);
  `);
  traverse(ast, {
    Program(path) {
      const binding = path.scope.getBinding('obj')!;
      inlineObjectProperties(binding);
    },
  });
  expect(ast).toMatchInlineSnapshot(`console.log(0x2f2, '0x396');`);
});

test('inline function call', () => {
  const ast = parse(`
    function f(a, b) {
      return a + b;
    }
    fn(1, 2);
  `);
  traverse(ast, {
    CallExpression(path) {
      const fn = path.parentPath.getPrevSibling().node as t.FunctionDeclaration;
      inlineFunctionCall(fn, path);
    },
  });
  expect(ast).toMatchInlineSnapshot(`
    function f(a, b) {
      return a + b;
    }
    1 + 2;
  `);
});

test('inline function call with too few args', () => {
  const ast = parse(`
    function f(a, b, c) {
      return a + b + c;
    }
    fn(1, 2);
  `);
  traverse(ast, {
    CallExpression(path) {
      const fn = path.parentPath.getPrevSibling().node as t.FunctionDeclaration;
      inlineFunctionCall(fn, path);
    },
  });
  expect(ast).toMatchInlineSnapshot(`
    function f(a, b, c) {
      return a + b + c;
    }
    1 + 2 + void 0;
  `);
});

test('inline function call with rest arg', () => {
  const ast = parse(`
    function f(a, ...b) {
      return a(...b);
    }
    fn(x, 1, 2, 3);
  `);
  traverse(ast, {
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: 'fn' })) {
        const fn = path.parentPath.getPrevSibling()
          .node as t.FunctionDeclaration;
        inlineFunctionCall(fn, path);
      }
    },
  });
  expect(ast).toMatchInlineSnapshot(`
    function f(a, ...b) {
      return a(...b);
    }
    x(1, 2, 3);
  `);
});
