import { test } from 'vitest';
import { testTransform } from '../../../test';
import optionalChaining from '../transforms/optional-chaining';

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

test.skip('computed member expression (Babel)', () =>
  expectJS(`
    var _a;
    (_a = a) === null || _a === void 0 ? void 0 : _a[0];
  `).toMatchInlineSnapshot(`a?.[0];`));

test.skip('call expression (Babel)', () =>
  expectJS(`
    var _a;
    (_a = a) === null || _a === void 0 ? void 0 : _a();
  `).toMatchInlineSnapshot(`a?.();`));

test.skip('call expression (TS)', () =>
  expectJS(`
    a === null || a === void 0 ? void 0 : a();
  `).toMatchInlineSnapshot(`a?.();`));
