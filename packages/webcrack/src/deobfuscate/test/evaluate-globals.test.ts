import { test } from 'vitest';
import { testTransform } from '../../../test/index';
import evaluateGlobals from '../evaluate-globals';

const expectJS = testTransform(evaluateGlobals);

test('atob', () =>
  expectJS('atob("aGVsbG8=")').toMatchInlineSnapshot('"hello";'));

test('atob that throws', () =>
  expectJS('atob("-")').toMatchInlineSnapshot(`atob("-");`));

test('unescape', () =>
  expectJS('unescape("%41")').toMatchInlineSnapshot('"A";'));

test('decodeURI', () =>
  expectJS('decodeURI("%41")').toMatchInlineSnapshot('"A";'));

test('decodeURIComponent', () =>
  expectJS('decodeURIComponent("%41")').toMatchInlineSnapshot('"A";'));
