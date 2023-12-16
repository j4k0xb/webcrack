import { test } from 'vitest';
import { testTransform } from '../../../test';
import { logicalToIf } from '../transforms';

const expectJS = testTransform(logicalToIf);

test('and', () =>
  expectJS(`
    x && y && z();
  `).toMatchInlineSnapshot(`
    if (x && y) {
      z();
    }
  `));

test('or', () =>
  expectJS(`
    x || y || z();
  `).toMatchInlineSnapshot(`
    if (!(x || y)) {
      z();
    }
  `));
