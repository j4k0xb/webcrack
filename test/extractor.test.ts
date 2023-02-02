import assert from 'assert';
import { readFile } from 'fs/promises';
import { describe, expect, test } from 'vitest';
import webcrack from '../src/index';

describe('extractor', async () => {
  test('webpack', async () => {
    const { bundle } = webcrack(
      await readFile('./test/samples/webpack.js', 'utf8')
    );
    expect(bundle).toBeDefined();
    assert(bundle);
    expect(bundle.type).toBe('webpack');
    expect(bundle.entryId).toBe(2);
    expect(bundle.modules.size).toBe(3);
    for (const module of bundle.modules.values()) {
      expect(module.ast).toMatchSnapshot();
    }
  });
});
