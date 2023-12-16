import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { describe, expect, test } from 'vitest';
import {
  generate,
  inlineFunctionAliases,
  inlineVariableAliases,
} from '../../ast-utils';

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
