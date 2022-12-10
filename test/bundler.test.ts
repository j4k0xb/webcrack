import { parse } from '@babel/parser';
import { readFile } from 'fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectBundler } from '../src/bundler';

describe('bundler', async () => {
  const ast = parse(
    await readFile(join(__dirname, 'fixtures', 'webpack.js'), 'utf8')
  );

  it('detects webpack', () => {
    expect(detectBundler(ast)).toBe('webpack');
  });
});
