import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { readFile } from 'fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { findStringArray } from '../src/deobfuscator/stringArray';
import { webcrack } from '../src/index';
import {
  inlineFunctionAliases,
  inlineVariableAliases,
} from '../src/utils/inline';

// Test samples
test.each([
  'obfuscator.io.js',
  'obfuscator.io-rotator-unary.js',
  'obfuscator.io-multi-encoders.js',
  'obfuscator.io-function-wrapper.js',
  'obfuscator.io-control-flow.js',
  'obfuscator.io-high.js',
])(`deobfuscate %s`, async filename => {
  const result = await webcrack(
    await readFile(join('./test/samples', filename), 'utf8')
  );
  expect(result.code).toMatchSnapshot();
});

describe('find string array', async () => {
  const ast = parse(await readFile('./test/samples/obfuscator.io.js', 'utf8'));

  test('function wrapper', () => {
    const stringArray = findStringArray(ast);
    expect(stringArray).toBeDefined();
    expect(stringArray!.name).toBe('__STRING_ARRAY__');
    expect(stringArray!.references).toHaveLength(3);
    expect(stringArray!.length).toBe(25);
  });
});

describe('inline decoder', () => {
  test('inline variable', () => {
    const ast = parse(`
      function decoder() {}
      decoder(1);
      (() => {
        const alias = decoder, alias3 = alias;
        alias(2);
        alias3(3);
        (() => {
          let alias2;
          (alias2 = alias)(4);
        });
      });
  `);
    traverse(ast, {
      FunctionDeclaration(path) {
        const binding = path.scope.getBinding('decoder')!;
        inlineVariableAliases(binding);
        path.stop();
      },
    });
    expect(generate(ast).code).toMatchSnapshot();
  });

  test('inline function', () => {
    const ast = parse(`
      function decoder() {}
      decoder(1);
      (() => {
        function alias(a, b) {
          return decoder(a - 625, b);
        }
        alias(2, 3);
        (() => {
          function alias2(a, b) {
            return alias(b - -678, a);
          }
          alias2(4, 5);
        })();
      })();
  `);
    traverse(ast, {
      FunctionDeclaration(path) {
        const binding = path.scope.parent.bindings.decoder;
        inlineFunctionAliases(binding);
        path.stop();
      },
    });

    expect(generate(ast).code).toMatchSnapshot();
  });
});
