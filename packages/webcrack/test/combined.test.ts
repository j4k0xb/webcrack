import { expect, test } from 'vitest';
import { webcrack } from '../src/index.js';

test('split-for-loop-vars, optional-chaining', async () => {
  const code = `
    for (var v, d = [1], b = 0x0; b < d.length; b++) {}
    if ((null === (v = null) || void 0x0 === v ? void 0x0 : v['length'])) {}
  `;
  const result = await webcrack(code);
  expect(result.code).toMatchInlineSnapshot(`
    "for (var d = [1], b = 0; b < d.length; b++) {}
    if (null?.length) {}"
  `);
});
