import { test } from 'vitest';
import { testTransform } from '../../../test';
import { nullishCoalescingAssignment } from '../transforms';

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

test('member expression assignment (TS)', () =>
  expectJS(`
    a.b ?? (a.b = c);
  `).toMatchInlineSnapshot(`a.b ??= c;`));
