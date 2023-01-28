import { parse } from '@babel/parser';
import * as t from '@babel/types';
import { readFile } from 'fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
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
  test('detect webpack', ({ info }) => {
    expect(info.type).toBe('webpack');
  });

  test('extract module information', ({ info }) => {
    const entryModule = info.modules.get(info.entryId)!;
    expect(info.modules).toHaveLength(3);
    expect(entryModule.getAST()).toMatchSnapshot();
  });

  test('rename factory params', ({ info }) => {
    const entryModule = info.modules.get(info.entryId)!;
    entryModule.renameParams();
    expect(entryModule.getAST()).toMatchSnapshot();
  });
});
