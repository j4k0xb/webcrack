import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as m from '@codemod/matchers';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { relativePath } from '../utils/path';
import { Module } from './module';
import * as webpack from './webpack';

export function extractBundle(ast: t.Node): Bundle | undefined {
  return webpack.extract(ast);
}

export class Bundle {
  constructor(
    public type: 'webpack',
    public entryId: number,
    public modules: Map<number, Module>
  ) {}

  applyMappings(mappings: Record<string, m.Matcher<any>>) {
    for (const module of this.modules.values()) {
      traverse(module.ast, {
        enter(path) {
          for (const [name, matcher] of Object.entries(mappings)) {
            if (matcher.match(path.node)) {
              module.path = name;
              path.stop();
              break;
            }
          }
        },
        noScope: true,
      });
    }
  }

  /**
   * Saves each module to a file and the bundle metadata to a JSON file.
   * @param path Output directory
   */
  save(path: string) {
    const bundleJson = {
      type: this.type,
      entryId: this.entryId,
      modules: Array.from(this.modules.values(), module => ({
        id: module.id,
        path: module.path,
      })),
    };

    mkdirSync(path, { recursive: true });

    writeFileSync(
      join(path, 'bundle.json'),
      JSON.stringify(bundleJson, null, 2),
      'utf8'
    );

    this.modules.forEach(module => {
      const modulePath = join(path, module.path);
      mkdirSync(dirname(modulePath), { recursive: true });
      writeFileSync(modulePath, module.code, 'utf8');
    });
  }

  /**
   * Replaces `require(id)` calls with `require("./relative/path.js")` calls.
   */
  replaceRequireCalls() {
    const idMatcher = m.capture(m.numericLiteral());
    const matcher = m.callExpression(m.identifier('require'), [idMatcher]);

    this.modules.forEach(module => {
      traverse(module.ast, {
        enter: path => {
          if (matcher.match(path.node)) {
            const requiredModule = this.modules.get(idMatcher.current!.value);
            if (requiredModule) {
              const [arg] = path.get('arguments') as NodePath<t.Identifier>[];
              arg.replaceWith(
                t.stringLiteral(relativePath(module.path, requiredModule.path))
              );
            }
          }
        },
        noScope: true,
      });
    });
  }
}
