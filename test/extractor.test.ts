import * as m from '@codemod/matchers';
import assert from 'assert';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { describe, expect, test } from 'vitest';
import { webcrack } from '../src/index';
import { relativePath, resolveDependencyTree } from '../src/utils/path';

// Test samples
test.each([
  'webpack.js',
  'webpack_object.js',
  'webpack-esm.js',
  'webpack-var-injection.js',
  'webpack5-object.js',
  'webpack5-esm.js',
  'browserify.js',
  'browserify-2.js',
])('extract %s', async filename => {
  const { bundle } = await webcrack(
    await readFile(join('test', 'samples', filename), 'utf8')
  );
  assert(bundle);
  bundle.applyTransforms();
  expect(bundle).toMatchSnapshot();
});

describe('extractor', () => {
  test('path mapping', async () => {
    const { bundle } = await webcrack(
      await readFile('./test/samples/webpack.js', 'utf8')
    );
    expect(bundle).toBeDefined();
    assert(bundle);
    bundle.applyMappings({ './utils/color.js': m.stringLiteral('#FBC02D') });
    bundle.applyTransforms();
    expect(bundle).toMatchSnapshot();
  });
});

describe('paths', () => {
  test('relative paths', () => {
    expect(relativePath('./a.js', './x/y.js')).toBe('./x/y.js');
    expect(relativePath('./x/y.js', './a.js')).toBe('../a.js');
  });

  test('resolve browserify paths', () => {
    const dependencies = {
      0: { 1: './a.js', 4: 'lib' },
      1: { 2: '../bar/b.js' },
      2: { 3: '../../c.js' },
      3: {},
      4: {},
    };
    expect(resolveDependencyTree(dependencies, 0)).toEqual({
      0: 'tmp0/tmp1/index.js',
      1: 'tmp0/tmp1/a.js',
      2: 'tmp0/bar/b.js',
      3: 'c.js',
      4: 'node_modules/lib/index.js',
    });
  });

  test('resolve browserify paths 2', () => {
    const dependencies = {
      1: {},
      2: { 5: './v1', 6: './v4' },
      3: {},
      4: {},
      5: { 3: './lib/bytesToUuid', 4: './lib/rng' },
      6: { 3: './lib/bytesToUuid', 4: './lib/rng' },
      7: { 1: 'number', 2: 'uuid' },
    };
    expect(resolveDependencyTree(dependencies, 7)).toEqual({
      1: 'node_modules/number/index.js',
      2: 'node_modules/uuid/index.js',
      3: 'node_modules/uuid/lib/bytesToUuid.js',
      4: 'node_modules/uuid/lib/rng.js',
      5: 'node_modules/uuid/v1.js',
      6: 'node_modules/uuid/v4.js',
      7: 'index.js',
    });
  });
});
