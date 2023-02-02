import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { readFile } from 'fs/promises';
import { describe, expect, test } from 'vitest';
import { findStringArray } from '../src/deobfuscator/stringArray';
import { webcrack } from '../src/index';
import { inlineFunctionAliases, inlineVariableAliases } from '../src/utils/ast';

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

describe('encoders', () => {
  test('multiple', async () => {
    const result = webcrack(
      await readFile('./test/samples/obfuscator.io-multi-encoders.js', 'utf8')
    );
    expect(result.code).toMatchSnapshot();
  });
});

describe('inline decoder', () => {
  test('inline variable', () => {
    const ast = parse(`
      function decoder() {}
      decoder(1);
      (() => {
        const alias = decoder;
        alias(2);
        (() => {
          const alias2 = alias;
          alias2(3);
        });
      });
  `);
    traverse(ast, {
      FunctionDeclaration(path) {
        const binding = path.scope.parent.bindings.decoder;
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
