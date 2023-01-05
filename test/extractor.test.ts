import { parse } from '@babel/parser';
import * as t from '@babel/types';
import { readFile } from 'fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { BundleInfo, getBundleInfo } from '../src/extractor';

declare module 'vitest' {
  export interface TestContext {
    ast: t.File;
    info: BundleInfo;
  }
}

beforeEach(async context => {
  context.ast = parse(
    await readFile(join(__dirname, 'samples', 'webpack.js'), 'utf8')
  );
  context.info = getBundleInfo(context.ast)!;
});

describe('extractor', async () => {
  it('detects webpack', ({ info }) => {
    expect(info.type).toBe('webpack');
  });

  it('extracts module information', ({ info }) => {
    const entryModule = info.modules.get(info.entryId)!;
    expect(info.modules).toHaveLength(3);
    expect(entryModule.getCode()).toMatchSnapshot();
  });

  it('renames factory params', ({ info }) => {
    const entryModule = info.modules.get(info.entryId)!;
    entryModule.renameParams();
    expect(entryModule.getCode()).toMatchSnapshot();
  });
});
