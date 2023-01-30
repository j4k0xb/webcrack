import { parse } from '@babel/parser';
import { readFile } from 'fs/promises';
import { describe, expect, test } from 'vitest';
import { findStringArray } from '../src/deobfuscator/stringArray';

describe('find string array', async () => {
  const ast = parse(await readFile('./test/samples/obfuscator.io.js', 'utf8'));

  test('function wrapper', () => {
    const stringArray = findStringArray(ast);
    expect(stringArray).toBeDefined();
    expect(stringArray!.name).toBe('__STRING_ARRAY__');
    expect(stringArray!.references).toHaveLength(2);
    expect(stringArray!.strings).toHaveLength(25);
  });
});
