import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { expect, test } from 'vitest';
import {
  inlineArrayElements,
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
