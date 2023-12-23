import { test } from 'vitest';
import { testTransform } from '../../../test';
import logicalToIf from '../transforms/logical-to-if';

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
