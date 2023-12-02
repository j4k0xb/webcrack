import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  generate,
  inlineFunctionAliases,
  inlineVariableAliases,
} from '@webcrack/ast-utils';
import { readFile } from 'fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { webcrack } from '../../webcrack/src/index';

// Test samples
test.each([
  'obfuscator.io.js',
  'obfuscator.io-rotator-unary.js',
  'obfuscator.io-multi-encoders.js',
  'obfuscator.io-function-wrapper.js',
  'obfuscator.io-calls-transform.js',
  'obfuscator.io-control-flow.js',
  'obfuscator.io-control-flow-split-strings.js',
  'obfuscator.io-control-flow-keys.js',
  'obfuscator.io-control-flow-partial-keys.js',
  'obfuscator.io-control-flow-switch-return.js',
  'obfuscator.io-control-flow-spread.js',
  'obfuscator.io-high.js',
  'simple-string-array.js',
])('deobfuscate %s', async (filename) => {
  const result = await webcrack(
    await readFile(join(__dirname, 'samples', filename), 'utf8'),
  );
  expect(result.code).toMatchSnapshot();
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
        let alias4;
        alias4 = alias;
        alias4(5);
      });
  `);
    traverse(ast, {
      FunctionDeclaration(path) {
        const binding = path.scope.getBinding('decoder')!;
        inlineVariableAliases(binding);
        path.stop();
      },
    });
    expect(generate(ast)).toMatchSnapshot();
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

    expect(generate(ast)).toMatchSnapshot();
  });
});
