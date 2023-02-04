import assert from 'assert';
import { readFile } from 'fs/promises';
import { describe, expect, test } from 'vitest';
import webcrack from '../src/index';
import { relativePath } from '../src/utils/path';

describe('extractor', async () => {
  test('webpack array', async () => {
    const { bundle } = await webcrack(
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

  test('webpack object', async () => {
    const { bundle } = await webcrack(
      await readFile('./test/samples/webpack_object.js', 'utf8')
    );
    expect(bundle).toBeDefined();
    assert(bundle);
    expect(bundle.type).toBe('webpack');
    expect(bundle.entryId).toBe(386);
    expect(bundle.modules.size).toBe(2);
    for (const module of bundle.modules.values()) {
      expect(module.ast).toMatchSnapshot();
    }
  });

  test('path mapping', async () => {
    const { bundle } = await webcrack(
      await readFile('./test/samples/webpack.js', 'utf8'),
      { mappings: m => ({ './utils/color.js': m.stringLiteral('#FBC02D') }) }
    );
    expect(bundle).toBeDefined();
    assert(bundle);
    for (const module of bundle.modules.values()) {
      expect(module.ast).toMatchSnapshot();
    }
  });
});

test('relative paths', () => {
  expect(relativePath('./a.js', './x/y.js')).toBe('./x/y.js');
  expect(relativePath('./x/y.js', './a.js')).toBe('../a.js');
});
