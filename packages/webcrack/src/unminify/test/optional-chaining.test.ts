import { test } from 'vitest';
import { testTransform } from '../../../test';
import { optionalChaining } from '../transforms';

const expectJS = testTransform(optionalChaining);

test('member expression (TS)', () =>
  expectJS(`
    a === null || a === undefined ? undefined : a.b;
  `).toMatchInlineSnapshot(`a?.b;`));

test('computed member expression (TS)', () =>
  expectJS(`
    a === null || a === undefined ? undefined : a[b];
  `).toMatchInlineSnapshot(`a?.[b];`));

test('member expression (Babel)', () =>
  expectJS(`
    var _a;
    (_a = a) === null || _a === undefined ? undefined : _a.b;
  `).toMatchInlineSnapshot(`a?.b;`));
