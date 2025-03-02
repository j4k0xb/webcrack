import * as m from '@codemod/matchers';
import { expect, test } from 'vitest';
import { anySubList } from '../matcher.js';

test('any sub list', () => {
  const a = m.capture(m.matcher((x) => x === 2));
  const b = m.capture(m.matcher((x) => x === 4));

  expect(anySubList(a, b).match([1, 2, 3, 4, 5])).toBe(true);
  expect(a.currentKeys).toEqual([1]);
  expect(b.currentKeys).toEqual([3]);
});
