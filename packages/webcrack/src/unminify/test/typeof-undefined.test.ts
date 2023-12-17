import { test } from 'vitest';
import { testTransform } from '../../../test';
import { typeofUndefined } from '../transforms';

const expectJS = testTransform(typeofUndefined);

test('typeof greater than', () =>
  expectJS('typeof a > "u"').toMatchInlineSnapshot(
    `typeof a === "undefined";`,
  ));

test('typeof less than', () =>
  expectJS('typeof a < "u"').toMatchInlineSnapshot(
    `typeof a !== "undefined";`,
  ));
