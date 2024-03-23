import { Bundle } from '../bundle';
import { relativePath } from '../path';
import type { WebpackChunk } from './chunk';
import type { WebpackModule } from './module';

export class WebpackBundle extends Bundle {
  declare modules: Map<string, WebpackModule>;
  chunks: WebpackChunk[];

  constructor(
    entryId: string,
    modules: Map<string, WebpackModule>,
    chunks: WebpackChunk[] = [],
  ) {
    super('webpack', entryId, modules);
    this.chunks = chunks;

    this.modules.forEach((module) => {
      module.applyTransforms((moduleId) => this.resolvePath(module, moduleId));
    });
  }

  private resolvePath(module: WebpackModule, moduleId: string): string {
    const importedModule = this.modules.get(moduleId);
    // probably external or in an unknown chunk, keep as is
    if (!importedModule) return moduleId;

    // use external path instead of the module that re-exports it
    if (importedModule.externalModule) return importedModule.externalModule;

    return relativePath(module.path, importedModule.path);
  }
}
