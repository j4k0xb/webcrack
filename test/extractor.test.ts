import * as m from '@codemod/matchers';
import assert from 'assert';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { describe, expect, test } from 'vitest';
import { webcrack } from '../src/index';
import { relativePath } from '../src/utils/path';

// Test samples
test.each([
  'webpack.js',
  'webpack_object.js',
  'webpack-esm.js',
  'webpack-var-injection.js',
  'webpack5_object.js',
])('extract %s', async filename => {
  const { bundle } = await webcrack(
    await readFile(join('test', 'samples', filename), 'utf8')
  );
  assert(bundle);
  bundle.applyTransforms();
  for (const module of bundle.modules.values()) {
    expect(module.ast).toMatchSnapshot();
  }
});

describe('extractor', async () => {
  test('webpack array', async () => {
    const { bundle } = await webcrack(
      await readFile('./test/samples/webpack.js', 'utf8')
    );
    expect(bundle).toBeDefined();
    assert(bundle);
    expect(bundle.type).toBe('webpack');
    expect(bundle.entryId).toBe(2);
  });

  test('webpack object', async () => {
    const { bundle } = await webcrack(
      await readFile('./test/samples/webpack_object.js', 'utf8')
    );
    expect(bundle).toBeDefined();
    assert(bundle);
    expect(bundle.type).toBe('webpack');
    expect(bundle.entryId).toBe(386);
  });

  test('path mapping', async () => {
    const { bundle } = await webcrack(
      await readFile('./test/samples/webpack.js', 'utf8')
    );
    expect(bundle).toBeDefined();
    assert(bundle);
    bundle.applyMappings({ './utils/color.js': m.stringLiteral('#FBC02D') });
    bundle.applyTransforms();

    for (const module of bundle.modules.values()) {
      expect(module.ast).toMatchSnapshot();
    }
  });
});

test('relative paths', () => {
  expect(relativePath('./a.js', './x/y.js')).toBe('./x/y.js');
  expect(relativePath('./x/y.js', './a.js')).toBe('../a.js');
});
