import { test } from 'vitest';
import { testTransform } from '../../../test';
import nullishCoalescingAssignment from '../transforms/nullish-coalescing-assignment';

const expectJS = testTransform(nullishCoalescingAssignment);

test('identifier assignment (Babel)', () =>
  expectJS(`
    a ?? (a = b);
  `).toMatchInlineSnapshot(`a ??= b;`));

test('member expression assignment (Babel)', () =>
  expectJS(`
    var _a;
    (_a = a).b ?? (_a.b = c);
  `).toMatchInlineSnapshot(`a.b ??= c;`));

test('computed member expression assignment (Babel)', () =>
  expectJS(`
    var _a;
    (_a = a)[b] ?? (_a[b] = c);
  `).toMatchInlineSnapshot(`a[b] ??= c;`));

test('member expression assignment (TS)', () =>
  expectJS(`
    a.b ?? (a.b = c);
  `).toMatchInlineSnapshot(`a.b ??= c;`));

test.skip('TS', () =>
  expectJS(`
    var _c;
    (_c = c.foo).baz ?? (_c.baz = result.foo.baz);
  `).toMatchInlineSnapshot(`c.foo.baz ??= result.foo.baz;`));

test.skip('TS', () =>
  expectJS(`
    var _a;
    obj[_a = incr()] ?? (obj[_a] = incr());
  `).toMatchInlineSnapshot(`obj[incr()] ??= incr();`));

test.skip('TS', () =>
  expectJS(`
    var _b;
    var _c;
    (_b = oobj.obj)[_c = incr()] ?? (_b[_c] = incr());
  `).toMatchInlineSnapshot(`oobj["obj"][incr()] ??= incr();`));
