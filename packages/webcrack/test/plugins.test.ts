import { expect, test, vi } from 'vitest';
import { webcrack } from '../src';
import type { Plugin } from '../src/plugin';

test('run plugin after parse', async () => {
  const pre = vi.fn();
  const post = vi.fn();

  const plugin: Plugin = ({ types: t }) => ({
    runAfter: 'parse',
    pre,
    post,
    visitor: {
      NumericLiteral(path) {
        path.replaceWith(t.stringLiteral('x'));
      },
    },
  });
  const result = await webcrack('1 + 1;', {
    plugins: { afterParse: [plugin] },
  });

  expect(pre).toHaveBeenCalledOnce();
  expect(post).toHaveBeenCalledOnce();
  expect(result.code).toBe('"xx";');
});
