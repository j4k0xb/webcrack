import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { describe, expect, test } from 'vitest';
import { renameFast, renameParameters } from '../rename';

describe('rename variable', () => {
  test('conflict with existing binding', () => {
    const ast = parse('let a = 1; let b = a;');
    traverse(ast, {
      Program(path) {
        const binding = path.scope.getBinding('a')!;
        renameFast(binding, 'b');

        expect(path.scope.bindings).keys('b', '_b');
      },
    });
    expect(ast).toMatchInlineSnapshot(`
      let b = 1;
      let _b = b;
    `);
  });

  test('duplicate function binding', () => {
    const ast = parse('var a; function a() {}');
    traverse(ast, {
      Program(path) {
        const binding = path.scope.getBinding('a')!;
        renameFast(binding, 'b');
      },
    });
    expect(ast).toMatchInlineSnapshot(`
      var b;
      function b() {}
    `);
  });

  test('different types of assignments', () => {
    const ast = parse(`
      var a = 1;
      var a = 2;
      a = 3;
      a++;
      [a] = [2];
      var [a] = [1];
      ({...a} = {});
      for (a of []);
      for (a in []);
      delete a;
    `);
    traverse(ast, {
      Program(path) {
        const binding = path.scope.getBinding('a')!;
        renameFast(binding, 'b');
      },
    });
    expect(ast).toMatchInlineSnapshot(`
      var b = 1;
      var b = 2;
      b = 3;
      b++;
      [b] = [2];
      var [b] = [1];
      ({
        ...b
      } = {});
      for (b of []);
      for (b in []);
      delete b;
    `);
  });
});

describe('rename parameters', () => {
  test('fewer than specified', () => {
    const ast = parse('function f(a, b, c) { a + b + c;}');
    traverse(ast, {
      Function(path) {
        renameParameters(path, ['x', 'y']);
      },
    });
    expect(ast).toMatchInlineSnapshot(`
      function f(x, y, c) {
        x + y + c;
      }
    `);
  });

  test('more than specified', () => {
    const ast = parse('function f(a, b, c) { a + b + c;}');
    traverse(ast, {
      Function(path) {
        renameParameters(path, ['x', 'y', 'z', 'w']);
      },
    });
    expect(ast).toMatchInlineSnapshot(`
      function f(x, y, z) {
        x + y + z;
      }
    `);
  });
});
