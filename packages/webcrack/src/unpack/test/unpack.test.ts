import * as m from '@codemod/matchers';
import { readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, sep } from 'path';
import { expect, test } from 'vitest';
import { unpack } from '../index';

const SAMPLES_DIR = join(__dirname, 'samples');

test('detect top-level bundle first', async () => {
  const bundle = unpack(
    await readFile(join(SAMPLES_DIR, 'browserify-webpack-nested.js'), 'utf8'),
  );
  expect(bundle!.type).toBe('browserify');
});

test('path mapping', async () => {
  const bundle = unpack(
    await readFile(join(SAMPLES_DIR, 'webpack.js'), 'utf8'),
    {
      './utils/color.js': m.stringLiteral('#FBC02D'),
      package: m.numericLiteral(4),
    },
  );
  expect(bundle).toBeDefined();
  expect(bundle!).toMatchSnapshot();
});

test.runIf(sep === '/')('prevent path traversal (posix)', async () => {
  const code = await readFile(
    join(SAMPLES_DIR, 'webpack-path-traversal.js'),
    'utf8',
  );
  const bundle = unpack(code);
  expect(bundle).toBeDefined();

  const dir = join(tmpdir(), 'path-traversal-test');
  await expect(bundle!.save(dir)).rejects.toThrow('path traversal');
});

test.runIf(sep === '\\')('prevent path traversal (windows)', async () => {
  const code = await readFile(
    join(SAMPLES_DIR, 'webpack-path-traversal-windows.js'),
    'utf8',
  );
  const bundle = unpack(code);
  expect(bundle).toBeDefined();

  const dir = join(tmpdir(), 'path-traversal-test');
  await expect(bundle!.save(dir)).rejects.toThrow('path traversal');
});
