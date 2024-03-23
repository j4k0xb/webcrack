import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { webcrack } from '../src';

const obfuscatedSrc = await readFile(
  join(__dirname, '../src/deobfuscate/test/samples/obfuscator.io.js'),
  'utf8',
);
const webpackSrc = await readFile(
  join(__dirname, '../src/unpack/test/samples/webpack-4.js'),
  'utf8',
);

describe('options', () => {
  test('no deobfuscate', async () => {
    await webcrack(webpackSrc, { deobfuscate: false });
  });

  test('no unminify', async () => {
    const result = await webcrack('console["log"](1)', { unminify: false });
    expect(result.code).toBe('console["log"](1);');
  });

  test('no unpack', async () => {
    const result = await webcrack(webpackSrc, { unpack: false });
    expect(result.bundle).toBeUndefined();
  });

  test('no jsx', async () => {
    const result = await webcrack('React.createElement("div", null)', {
      jsx: false,
    });
    expect(result.code).toBe('React.createElement("div", null);');
  });

  test('custom sandbox', async () => {
    const sandbox = vi.fn((code: string) =>
      /* isolated-vm or something */ Promise.resolve(code),
    );
    await webcrack(obfuscatedSrc, { sandbox });
    expect(sandbox).toHaveBeenCalledOnce();
  });

  test('mangle', async () => {
    const result = await webcrack('const foo = 1;', { mangle: true });
    expect(result.code).not.contain('foo');
  });
});
