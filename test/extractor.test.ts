import { parse } from '@babel/parser';
import { readFile } from 'fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getBundleInfo } from '../src/extractor';

describe('extractor', async () => {
  const ast = parse(
    await readFile(join(__dirname, 'fixtures', 'webpack.js'), 'utf8')
  );

  it('detects webpack', () => {
    const info = getBundleInfo(ast);
    expect(info?.type).toBe('webpack');
    expect(info?.modules).toHaveLength(3);
    expect(info?.modules.find(m => m.isEntry)).toBeTruthy();
  });
});
