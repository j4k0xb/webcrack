import * as m from '@codemod/matchers';
import assert from 'assert';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { expect, test } from 'vitest';
import { unpack } from '../src/index';

// Test samples
test.each([
  'webpack.js',
  'webpack-object.js',
  'webpack-esm.js',
  'webpack-var-injection.js',
  'webpack-jsonp-chunk.js',
  'webpack-0.11.x.js',
  'webpack5-object.js',
  'webpack5-esm.js',
  'browserify.js',
  'browserify-2.js',
])('unpack %s', async (filename) => {
  const bundle = unpack(
    await readFile(join(__dirname, 'samples', filename), 'utf8'),
  );
  expect(bundle).toMatchSnapshot();
});

test('detect top-level bundle first', async () => {
  const bundle = unpack(
    await readFile(
      join(__dirname, 'samples/browserify-webpack-nested.js'),
      'utf8',
    ),
  );
  assert(bundle);
  expect(bundle.type).toBe('browserify');
});

test('path mapping', async () => {
  const bundle = unpack(
    await readFile(join(__dirname, 'samples/webpack.js'), 'utf8'),
    {
      './utils/color.js': m.stringLiteral('#FBC02D'),
      package: m.numericLiteral(4),
    },
  );
  expect(bundle).toBeDefined();
  assert(bundle);
  expect(bundle).toMatchSnapshot();
});

test.skip('prevent path traversal', async () => {
  // const code = await readFile(
  //   join(__dirname, "samples/webpack-path-traversal.js"),
  //   "utf8",
  // );
  // const result = await webcrack(code);
  // const dir = join(tmpdir(), "path-traversal-test");
  // await expect(result.save(dir)).rejects.toThrow("path traversal");
});
