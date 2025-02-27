import traverse from '@babel/traverse';
import type * as m from '@codemod/matchers';
import { dirname, join, normalize, relative } from 'node:path';
import type { Module } from './module';

export class Bundle {
  type: 'webpack' | 'browserify';
  entryId: string;
  modules: Map<string, Module>;

  constructor(
    type: 'webpack' | 'browserify',
    entryId: string,
    modules: Map<string, Module>,
  ) {
    this.type = type;
    this.entryId = entryId;
    this.modules = modules;
  }

  applyMappings(mappings: Record<string, m.Matcher<unknown>>): void {
    const mappingPaths = Object.keys(mappings);
    if (mappingPaths.length === 0) return;

    const unusedMappings = new Set(mappingPaths);

    for (const module of this.modules.values()) {
      traverse(module.ast, {
        enter(path) {
          for (const mappingPath of mappingPaths) {
            if (mappings[mappingPath].match(path.node)) {
              if (unusedMappings.has(mappingPath)) {
                unusedMappings.delete(mappingPath);
              } else {
                throw new Error(`Mapping ${mappingPath} is already used.`);
              }
              const resolvedPath = mappingPath.startsWith('./')
                ? mappingPath
                : `node_modules/${mappingPath}`;
              module.path = resolvedPath;
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
  async save(path: string): Promise<void> {
    const bundleJson = {
      type: this.type,
      entryId: this.entryId,
      modules: Array.from(this.modules.values(), (module) => ({
        id: module.id,
        path: module.path,
      })),
    };

    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(path, { recursive: true });

    await writeFile(
      join(path, 'bundle.json'),
      JSON.stringify(bundleJson, null, 2),
      'utf8',
    );

    await Promise.all(
      Array.from(this.modules.values(), async (module) => {
        const modulePath = normalize(join(path, module.path));
        if (relative(path, modulePath).startsWith('..')) {
          throw new Error(`detected path traversal: ${module.path}`);
        }
        await mkdir(dirname(modulePath), { recursive: true });
        await writeFile(modulePath, module.code, 'utf8');
      }),
    );
  }

  applyTransforms(): void {}
}
