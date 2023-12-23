import { test } from 'vitest';
import { testTransform } from '../../../test';
import { nullishCoalescing } from '../transforms';

const expectJS = testTransform(nullishCoalescing);

test('identifier (Babel)', () =>
  expectJS(`
    var _a;
    (_a = a) !== null && _a !== undefined ? _a : b;
  `).toMatchInlineSnapshot(`
    a ?? b;
  `));

test('identifier (SWC/esbuild)', () =>
  expectJS(`
    a != null ? a : b;
  `).toMatchInlineSnapshot(`a ?? b;`));

test('identifier (TS)', () =>
  expectJS(`
    a !== null && a !== undefined ? a : b;
  `).toMatchInlineSnapshot(`a ?? b;`));

test('member expression (Babel)', () =>
  expectJS(`
    var _a$b;
    (_a$b = a.b) !== null && _a$b !== undefined ? _a$b : c;
  `).toMatchInlineSnapshot(`
    a.b ?? c;
  `));

test('member expression loose (Babel)', () =>
  expectJS(`
    var _opts$foo;
    var foo = (_opts$foo = opts.foo) != null ? _opts$foo : "default";
  `).toMatchInlineSnapshot(`
    var foo = opts.foo ?? "default";
  `));

test.skip('member expression (esbuild)', () =>
  expectJS(`
    var _a_b;
    ((_a_b = a.b) !== null && _a_b !== undefined) || c;
  `).toMatchInlineSnapshot(`
    a.b ?? c;
  `));

test.skip('default param (Babel)', () =>
  expectJS(`
    function foo(foo, qux = (_foo$bar => (_foo$bar = foo.bar) !== null && _foo$bar !== void 0 ? _foo$bar : "qux")()) {}
    function bar(bar, qux = bar !== null && bar !== void 0 ? bar : "qux") {}
  `).toMatchInlineSnapshot(`
    function foo(foo, qux = foo.bar ?? "qux") {}
    function bar(bar, qux = bar ?? "qux") {}
  `));
