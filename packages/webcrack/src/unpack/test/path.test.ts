import { expect, test } from 'vitest';
import { relativePath, resolveDependencyTree } from '../path';

test('relative paths', () => {
  expect(relativePath('./a.js', './x/y.js')).toBe('./x/y.js');
  expect(relativePath('./x/y.js', './a.js')).toBe('../a.js');
  expect(relativePath('./a.js', 'node_modules/lib')).toBe('lib');
});

test('resolve browserify paths', () => {
  const dependencies = {
    0: { 1: './a.js', 4: 'lib' },
    1: { 2: '../bar/b.js' },
    2: { 3: '../../c.js' },
    3: {},
    4: {},
  };
  expect(resolveDependencyTree(dependencies, '0')).toEqual({
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
  expect(resolveDependencyTree(dependencies, '7')).toEqual({
    1: 'node_modules/number/index.js',
    2: 'node_modules/uuid/index.js',
    3: 'node_modules/uuid/lib/bytesToUuid.js',
    4: 'node_modules/uuid/lib/rng.js',
    5: 'node_modules/uuid/v1.js',
    6: 'node_modules/uuid/v4.js',
    7: 'index.js',
  });
});

// FIXME: utils/index.js instead of utils.js, can only know the real path by
// checking if all relative paths point to the correct modules?
test.skip('resolve browserify paths with index directory', () => {
  const dependencies = {
    1: { 2: './utils', 4: './test' },
    2: { 3: './lib', 4: '../test' },
    3: {},
    4: {},
  };
  expect(resolveDependencyTree(dependencies, '1')).toEqual({
    1: 'index.js',
    2: 'utils/index.js',
    3: 'utils/lib.js',
    4: 'test.js',
  });
});

test('resolve circular browserify paths', () => {
  const dependencies = {
    1: { 2: './utils' },
    2: { 1: './base64' },
    3: { 1: './base64' },
  };
  expect(resolveDependencyTree(dependencies, '3')).toEqual({
    1: 'base64.js',
    2: 'utils.js',
    3: 'index.js',
  });
});
