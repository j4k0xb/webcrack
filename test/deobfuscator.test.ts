import { parse } from '@babel/parser';
import { readFile } from 'fs/promises';
import { describe, expect, test } from 'vitest';
import findStringArray from '../src/deobfuscator/stringArray';

describe('find string array', async () => {
  const ast = parse(await readFile('./test/samples/obfuscator.io.js', 'utf8'));

  test('type 1', () => {
    const stringArray = findStringArray(ast);
    expect(stringArray).toBeDefined();
    expect(stringArray!.references).toHaveLength(2);
    expect(stringArray).toMatchObject({
      name: 'c',
      strings: [
        'while (true) {}',
        'apply',
        'counter',
        'debu',
        'gger',
        'call',
        '590708XPLBWj',
        '931306ycAlTF',
        '1212dZxdja',
        '88goZCZH',
        '10gkeCxS',
        '1006854ASxxtT',
        '4464481uvpzKS',
        '8Jgsyfr',
        '3685185hiRGbv',
        '10xlLBXx',
        '31674555rUfUve',
        'function *\\( *\\)',
        '\\+\\+ *(?:[a-zA-Z_$][0-9a-zA-Z_$]*)',
        'init',
        'test',
        'chain',
        'log',
        'Hello World!',
        'constructor',
      ],
    });
  });
});
